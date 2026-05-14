import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { CreateProjectSchema, CreateStepSchema, EditStepsSchema } from "../schemas/project.js";

// 전체 탭에서 쓰는 프로젝트 API.
// 프로젝트 생성, 목록 조회, 삭제를 담당한다.
const router = Router();

type ProjectRow = {
  id: string;
  title: string | null; // 마이그레이션 004 — 기존 row는 NULL일 수 있어 매핑 시 goal로 fallback
  memo: string | null;
  goal: string;
  color: string | null;
  due: string | null;
  is_single: boolean;
  created_at: string;
};

type StepRow = {
  id: string;
  decomposition_id: string;
  order_idx: number;
  title: string;
  done: boolean;
  estimated_minutes: number | null;
};

type StepDetailRow = StepRow & {
  description: string | null;
  guide: string | null;
  first_move: string | null;
  unblocker: string | null;
  boundary_signal: string | null;
};

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const userId = req.userId;

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, title, memo, goal, color, due, is_single, created_at")
    .eq("user_id", userId)
    .order("due", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (projectsError) {
    res.status(500).json({ error: projectsError.message });
    return;
  }

  const projectRows = (projects ?? []) as ProjectRow[];
  const projectIds = projectRows.map((project) => project.id);

  if (projectIds.length === 0) {
    res.json({ projects: [] });
    return;
  }

  const { data: decompositions, error: decompositionsError } = await supabase
    .from("decompositions")
    .select("id, project_id, round")
    .in("project_id", projectIds)
    .order("round", { ascending: false });

  if (decompositionsError) {
    res.status(500).json({ error: decompositionsError.message });
    return;
  }

  const latestDecompositionByProject = new Map<string, string>();
  for (const decomposition of decompositions ?? []) {
    if (!latestDecompositionByProject.has(decomposition.project_id)) {
      latestDecompositionByProject.set(decomposition.project_id, decomposition.id);
    }
  }

  const decompositionIds = [...latestDecompositionByProject.values()];
  const { data: steps, error: stepsError } = decompositionIds.length
    ? await supabase
        .from("steps")
        .select("id, decomposition_id, order_idx, title, done, estimated_minutes")
        .in("decomposition_id", decompositionIds)
        .order("order_idx", { ascending: true })
    : { data: [], error: null };

  if (stepsError) {
    res.status(500).json({ error: stepsError.message });
    return;
  }

  const stepsByDecomposition = new Map<string, StepRow[]>();
  for (const step of (steps ?? []) as StepRow[]) {
    const group = stepsByDecomposition.get(step.decomposition_id) ?? [];
    group.push(step);
    stepsByDecomposition.set(step.decomposition_id, group);
  }

  res.json({
    projects: projectRows.map((project) => {
      const decompositionId = latestDecompositionByProject.get(project.id);
      const projectSteps = decompositionId ? stepsByDecomposition.get(decompositionId) ?? [] : [];
      const doneCount = projectSteps.filter((step) => step.done).length;
      const totalCount = projectSteps.length;
      const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
      const nextStep = projectSteps.find((step) => !step.done) ?? null;

      return {
        id: project.id,
        // 사용자 입력 제목을 우선 노출. 마이그레이션 004 이전 row는 title이 NULL이라 goal로 fallback.
        title: project.title ?? project.goal,
        memo: project.memo,
        color: project.color,
        due: project.due,
        isSingle: project.is_single,
        createdAt: project.created_at,
        progress,
        doneCount,
        totalCount,
        nextStep: nextStep
          ? {
              id: nextStep.id,
              title: nextStep.title,
              estimatedMinutes: nextStep.estimated_minutes,
            }
          : null,
      };
    }),
  });
});

// 프로젝트 단건 상세 조회 — 단계 전체(가이드 포함)를 반환한다.
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title, memo, goal, color, due, is_single, created_at")
    .eq("id", id)
    .eq("user_id", req.userId)
    .single();

  if (projectError || !project) {
    res.status(404).json({ error: "프로젝트를 찾을 수 없어요." });
    return;
  }

  const { data: decompositions, error: decompositionsError } = await supabase
    .from("decompositions")
    .select("id")
    .eq("project_id", id)
    .order("round", { ascending: false })
    .limit(1);

  if (decompositionsError) {
    res.status(500).json({ error: decompositionsError.message });
    return;
  }

  const decompositionId = decompositions?.[0]?.id ?? null;
  const steps: StepDetailRow[] = [];

  if (decompositionId) {
    const { data: stepData, error: stepsError } = await supabase
      .from("steps")
      .select("id, decomposition_id, order_idx, title, done, estimated_minutes, description, guide, first_move, unblocker, boundary_signal")
      .eq("decomposition_id", decompositionId)
      .order("order_idx", { ascending: true });

    if (stepsError) {
      res.status(500).json({ error: stepsError.message });
      return;
    }

    steps.push(...((stepData ?? []) as StepDetailRow[]));
  }

  const doneCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  res.json({
    id: project.id,
    // 사용자 입력 제목 우선. 마이그레이션 004 이전 row는 NULL이라 goal로 fallback.
    title: project.title ?? project.goal,
    memo: project.memo,
    color: project.color,
    due: project.due,
    isSingle: project.is_single,
    createdAt: project.created_at,
    progress,
    doneCount,
    totalCount,
    steps: steps.map((s) => ({
      id: s.id,
      orderIdx: s.order_idx,
      title: s.title,
      done: s.done,
      estimatedMinutes: s.estimated_minutes,
      description: s.description,
      guide: s.guide,
      firstMove: s.first_move,
      unblocker: s.unblocker,
      boundarySignal: s.boundary_signal,
    })),
  });
});

router.post("/", async (req, res) => {
  const userId = req.userId;
  const parsed = CreateProjectSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) });
    return;
  }

  const input = parsed.data;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      title: input.title,
      memo: input.memo,
      primary_type: input.primaryType,
      secondary_tags: input.secondaryTags,
      goal: input.goal,
      current_phase: input.currentPhase,
      color: input.color ?? "#ff6b3d",
      start_date: input.startDate,
      due: input.due,
      is_single: input.isSingle,
      scale: input.scale,
      template_id: input.templateId,
      template_name: input.templateName,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    res.status(500).json({ error: projectError?.message ?? "Failed to create project" });
    return;
  }

  const { data: decomposition, error: decompositionError } = await supabase
    .from("decompositions")
    .insert({
      project_id: project.id,
      round: 1,
      trigger: "initial",
    })
    .select("id")
    .single();

  if (decompositionError || !decomposition) {
    res.status(500).json({ error: decompositionError?.message ?? "Failed to create decomposition" });
    return;
  }

  const steps: z.infer<typeof CreateStepSchema>[] =
    input.steps.length > 0 ? input.steps : [{ title: input.goal }];

  const { error: stepsError } = await supabase.from("steps").insert(
    steps.map((step, index) => ({
      decomposition_id: decomposition.id,
      order_idx: index,
      title: step.title,
      description: step.description,
      guide: step.guide,
      first_move: step.firstMove,
      unblocker: step.unblocker,
      estimated_minutes: step.estimatedMinutes,
      boundary_signal: step.boundarySignal,
    })),
  );

  if (stepsError) {
    res.status(500).json({ error: stepsError.message });
    return;
  }

  res.status(201).json({ id: project.id });
});

// 단계 인라인 편집 — 새 round decomposition을 생성하고 편집된 단계들을 저장한다.
// 기존 단계 id가 있으면 메타데이터(가이드·설명 등)를 복사하고, 없으면 새 단계로 추가한다.
router.patch("/:id/steps", async (req, res) => {
  const { id } = req.params;

  const parsed = EditStepsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) });
    return;
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", req.userId)
    .single();

  if (projectError || !project) {
    res.status(404).json({ error: "프로젝트를 찾을 수 없어요." });
    return;
  }

  const { data: latestDecomps } = await supabase
    .from("decompositions")
    .select("id, round")
    .eq("project_id", id)
    .order("round", { ascending: false })
    .limit(1);

  const latestRound = latestDecomps?.[0]?.round ?? 0;
  const latestDecompId = latestDecomps?.[0]?.id ?? null;

  // 기존 단계 메타데이터 조회 (id 있는 단계에 복사하기 위해)
  const existingStepMap = new Map<string, StepDetailRow>();
  if (latestDecompId) {
    const { data: existingSteps } = await supabase
      .from("steps")
      .select("id, decomposition_id, order_idx, title, done, estimated_minutes, description, guide, boundary_signal")
      .eq("decomposition_id", latestDecompId);
    for (const s of (existingSteps ?? []) as StepDetailRow[]) {
      existingStepMap.set(s.id, s);
    }
  }

  const { data: newDecomp, error: decompError } = await supabase
    .from("decompositions")
    .insert({ project_id: id, round: latestRound + 1, trigger: "edit" })
    .select("id")
    .single();

  if (decompError || !newDecomp) {
    res.status(500).json({ error: decompError?.message ?? "Failed to create decomposition" });
    return;
  }

  const stepsToInsert = parsed.data.steps.map((step, index) => {
    const existing = step.id ? existingStepMap.get(step.id) : null;
    return {
      decomposition_id: newDecomp.id,
      order_idx: index,
      title: step.title,
      description: existing?.description ?? null,
      guide: existing?.guide ?? null,
      boundary_signal: existing?.boundary_signal ?? null,
      estimated_minutes: existing?.estimated_minutes ?? null,
      done: false,
    };
  });

  const { error: stepsError } = await supabase.from("steps").insert(stepsToInsert);
  if (stepsError) {
    res.status(500).json({ error: stepsError.message });
    return;
  }

  res.status(200).json({ ok: true });
});

// GET /api/projects/:id/rounds — 버전 목록 조회 (최신 3개까지)
// 각 round의 번호·생성일·trigger·단계 수를 반환한다.
router.get("/:id/rounds", async (req, res) => {
  const { id } = req.params;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", req.userId)
    .single();

  if (projectError || !project) {
    res.status(404).json({ error: "프로젝트를 찾을 수 없어요." });
    return;
  }

  const { data: decomps, error: decompsError } = await supabase
    .from("decompositions")
    .select("id, round, trigger, created_at")
    .eq("project_id", id)
    .order("round", { ascending: false })
    .limit(3);

  if (decompsError) {
    res.status(500).json({ error: decompsError.message });
    return;
  }

  // 각 decomposition의 단계 수를 조회한다.
  const decompsWithCount = await Promise.all(
    (decomps ?? []).map(async (d) => {
      const { count } = await supabase
        .from("steps")
        .select("id", { count: "exact", head: true })
        .eq("decomposition_id", d.id);
      return {
        round: d.round,
        decompositionId: d.id,
        trigger: d.trigger,
        createdAt: d.created_at,
        stepCount: count ?? 0,
      };
    }),
  );

  res.json({ rounds: decompsWithCount });
});

// POST /api/projects/:id/rounds/:round/restore — 특정 버전 복원
// 해당 round의 단계를 새 round로 복사한다 (done 상태는 초기화).
router.post("/:id/rounds/:round/restore", async (req, res) => {
  const { id, round } = req.params;
  const roundNum = Number(round);

  if (!Number.isInteger(roundNum) || roundNum < 1) {
    res.status(400).json({ error: "올바른 round 번호가 아니에요." });
    return;
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", req.userId)
    .single();

  if (projectError || !project) {
    res.status(404).json({ error: "프로젝트를 찾을 수 없어요." });
    return;
  }

  // 복원 대상 round의 decomposition 조회
  const { data: targetDecomp, error: targetError } = await supabase
    .from("decompositions")
    .select("id")
    .eq("project_id", id)
    .eq("round", roundNum)
    .single();

  if (targetError || !targetDecomp) {
    res.status(404).json({ error: "해당 버전을 찾을 수 없어요." });
    return;
  }

  // 복원 대상 단계 조회
  const { data: targetSteps, error: stepsError } = await supabase
    .from("steps")
    .select("order_idx, title, description, guide, first_move, unblocker, estimated_minutes, boundary_signal")
    .eq("decomposition_id", targetDecomp.id)
    .order("order_idx", { ascending: true });

  if (stepsError) {
    res.status(500).json({ error: stepsError.message });
    return;
  }

  // 현재 최신 round 조회
  const { data: latestDecomps } = await supabase
    .from("decompositions")
    .select("round")
    .eq("project_id", id)
    .order("round", { ascending: false })
    .limit(1);

  const latestRound = latestDecomps?.[0]?.round ?? 0;

  // 새 round 생성
  const { data: newDecomp, error: newDecompError } = await supabase
    .from("decompositions")
    .insert({ project_id: id, round: latestRound + 1, trigger: "restore" })
    .select("id")
    .single();

  if (newDecompError || !newDecomp) {
    res.status(500).json({ error: newDecompError?.message ?? "복원에 실패했어요." });
    return;
  }

  // 단계 복사 (done은 false로 초기화)
  const { error: insertError } = await supabase.from("steps").insert(
    (targetSteps ?? []).map((s) => ({
      decomposition_id: newDecomp.id,
      order_idx: s.order_idx,
      title: s.title,
      description: s.description,
      guide: s.guide,
      first_move: s.first_move,
      unblocker: s.unblocker,
      estimated_minutes: s.estimated_minutes,
      boundary_signal: s.boundary_signal,
      done: false,
    })),
  );

  if (insertError) {
    res.status(500).json({ error: insertError.message });
    return;
  }

  res.status(200).json({ ok: true });
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", req.userId);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(204).send();
});

export default router;
