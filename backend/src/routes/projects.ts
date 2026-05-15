import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { CreateProjectSchema, CreateStepSchema, CreateSubStepsSchema, EditStepsSchema } from "../schemas/project.js";

// 전체 탭에서 쓰는 프로젝트 API.
// 프로젝트 생성, 목록 조회, 삭제를 담당한다.
const router = Router();

// 프로젝트 색상 팔레트 — 신규 프로젝트 확정 시 사용자의 기존 색상과 겹치지 않게 랜덤 선택한다.
// §15.3 "각 프로젝트에 고유 색상" 원칙. 7개를 다 쓰면 재사용 허용.
const PROJECT_COLOR_PALETTE = [
  "#FF9478", // orange
  "#FFB85C", // amber
  "#FFD88A", // yellow
  "#7BC496", // green
  "#88BEEC", // sky
  "#B399E4", // purple
  "#FFB5C5", // pink
] as const;

async function pickColorForUser(userId: string | undefined): Promise<string> {
  const { data } = await supabase
    .from("projects")
    .select("color")
    .eq("user_id", userId);
  const used = new Set((data ?? []).map((p) => p.color).filter((c): c is string => !!c));
  const available = PROJECT_COLOR_PALETTE.filter((c) => !used.has(c));
  const pool = available.length > 0 ? available : PROJECT_COLOR_PALETTE;
  return pool[Math.floor(Math.random() * pool.length)];
}

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
  parent_step_id: string | null;
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
      .select("id, decomposition_id, parent_step_id, order_idx, title, done, estimated_minutes, description, guide, first_move, unblocker, boundary_signal")
      .eq("decomposition_id", decompositionId)
      .order("order_idx", { ascending: true });

    if (stepsError) {
      res.status(500).json({ error: stepsError.message });
      return;
    }

    steps.push(...((stepData ?? []) as StepDetailRow[]));
  }

  const topLevelSteps = steps.filter((s) => s.parent_step_id === null);
  const doneCount = topLevelSteps.filter((s) => s.done).length;
  const totalCount = topLevelSteps.length;
  const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  res.json({
    id: project.id,
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
      parentStepId: s.parent_step_id,
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

  // 명시적 color가 없으면 사용자의 기존 색상과 겹치지 않는 팔레트에서 랜덤 선택.
  const assignedColor = input.color ?? (await pickColorForUser(userId));

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
      color: assignedColor,
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

  const { data: insertedParents, error: stepsError } = await supabase
    .from("steps")
    .insert(
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
    )
    .select("id");

  if (stepsError || !insertedParents) {
    res.status(500).json({ error: stepsError?.message ?? "Failed to insert steps" });
    return;
  }

  const childRows: Array<{
    decomposition_id: string;
    parent_step_id: string;
    order_idx: number;
    title: string;
    description?: string;
    guide?: string;
    first_move?: string;
    unblocker?: string;
    estimated_minutes?: number;
    boundary_signal?: string;
  }> = [];
  let nextChildOrderIdx = steps.length;
  steps.forEach((parent, parentIdx) => {
    const parentDbId = insertedParents[parentIdx]?.id;
    if (!parentDbId || !parent.children?.length) return;
    for (const child of parent.children) {
      childRows.push({
        decomposition_id: decomposition.id,
        parent_step_id: parentDbId,
        order_idx: nextChildOrderIdx++,
        title: child.title,
        description: child.description,
        guide: child.guide,
        first_move: child.firstMove,
        unblocker: child.unblocker,
        estimated_minutes: child.estimatedMinutes,
        boundary_signal: child.boundarySignal,
      });
    }
  });

  if (childRows.length > 0) {
    const { error: childError } = await supabase.from("steps").insert(childRows);
    if (childError) {
      res.status(500).json({ error: childError.message });
      return;
    }
  }

  res.status(201).json({ id: project.id });
});

// 단계 인라인 편집 — 새 round decomposition을 생성하고 편집된 단계들을 저장한다.
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

  const existingStepMap = new Map<string, StepDetailRow>();
  if (latestDecompId) {
    const { data: existingSteps } = await supabase
      .from("steps")
      .select("id, decomposition_id, parent_step_id, order_idx, title, done, estimated_minutes, description, guide, first_move, unblocker, boundary_signal")
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

  const parentRows = parsed.data.steps.map((step, index) => {
    const existing = step.id ? existingStepMap.get(step.id) : null;
    return {
      decomposition_id: newDecomp.id,
      order_idx: index,
      title: step.title,
      description: existing?.description ?? null,
      guide: existing?.guide ?? null,
      first_move: existing?.first_move ?? null,
      unblocker: existing?.unblocker ?? null,
      boundary_signal: existing?.boundary_signal ?? null,
      estimated_minutes: existing?.estimated_minutes ?? null,
      done: existing?.done ?? false,
    };
  });

  const { data: insertedParents, error: stepsError } = await supabase
    .from("steps")
    .insert(parentRows)
    .select("id");
  if (stepsError || !insertedParents) {
    res.status(500).json({ error: stepsError?.message ?? "Failed to insert steps" });
    return;
  }

  const childRows: Array<{
    decomposition_id: string;
    parent_step_id: string;
    order_idx: number;
    title: string;
    description: string | null;
    guide: string | null;
    first_move: string | null;
    unblocker: string | null;
    boundary_signal: string | null;
    estimated_minutes: number | null;
    done: boolean;
  }> = [];
  let nextChildOrderIdx = parsed.data.steps.length;
  parsed.data.steps.forEach((parent, parentIdx) => {
    const parentDbId = insertedParents[parentIdx]?.id;
    if (!parentDbId || !parent.children?.length) return;
    for (const child of parent.children) {
      const existingChild = child.id ? existingStepMap.get(child.id) : null;
      childRows.push({
        decomposition_id: newDecomp.id,
        parent_step_id: parentDbId,
        order_idx: nextChildOrderIdx++,
        title: child.title,
        description: existingChild?.description ?? null,
        guide: existingChild?.guide ?? null,
        first_move: existingChild?.first_move ?? null,
        unblocker: existingChild?.unblocker ?? null,
        boundary_signal: existingChild?.boundary_signal ?? null,
        estimated_minutes: existingChild?.estimated_minutes ?? null,
        done: existingChild?.done ?? false,
      });
    }
  });

  if (childRows.length > 0) {
    const { error: childError } = await supabase.from("steps").insert(childRows);
    if (childError) {
      res.status(500).json({ error: childError.message });
      return;
    }
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

  const { data: targetSteps, error: stepsError } = await supabase
    .from("steps")
    .select("order_idx, title, description, guide, first_move, unblocker, estimated_minutes, boundary_signal")
    .eq("decomposition_id", targetDecomp.id)
    .order("order_idx", { ascending: true });

  if (stepsError) {
    res.status(500).json({ error: stepsError.message });
    return;
  }

  const { data: latestDecomps } = await supabase
    .from("decompositions")
    .select("round")
    .eq("project_id", id)
    .order("round", { ascending: false })
    .limit(1);

  const latestRound = latestDecomps?.[0]?.round ?? 0;

  const { data: newDecomp, error: newDecompError } = await supabase
    .from("decompositions")
    .insert({ project_id: id, round: latestRound + 1, trigger: "restore" })
    .select("id")
    .single();

  if (newDecompError || !newDecomp) {
    res.status(500).json({ error: newDecompError?.message ?? "복원에 실패했어요." });
    return;
  }

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

// 2차 분해 결과(하위 단계)를 부모 단계의 decomposition_id에 누적 insert 한다.
// 본인 프로젝트인지 + parentStepId가 그 프로젝트에 속하는지 검증한다.
router.post("/:projectId/sub-steps", async (req, res) => {
  const { projectId } = req.params;
  const parsed = CreateSubStepsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) });
    return;
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", req.userId)
    .single();

  if (projectError || !project) {
    res.status(404).json({ error: "프로젝트를 찾을 수 없어요." });
    return;
  }

  const { data: latestDecomp } = await supabase
    .from("decompositions")
    .select("id")
    .eq("project_id", projectId)
    .order("round", { ascending: false })
    .limit(1)
    .maybeSingle();

  const decompositionId = latestDecomp?.id;
  if (!decompositionId) {
    res.status(400).json({ error: "이 프로젝트에 분해 결과가 없어요." });
    return;
  }

  const { data: parentStep, error: parentError } = await supabase
    .from("steps")
    .select("id, decomposition_id, parent_step_id")
    .eq("id", parsed.data.parentStepId)
    .eq("decomposition_id", decompositionId)
    .single();

  if (parentError || !parentStep) {
    res.status(404).json({ error: "부모 단계를 찾을 수 없어요." });
    return;
  }

  if (parentStep.parent_step_id !== null) {
    res.status(400).json({ error: "2차까지만 분해할 수 있어요." });
    return;
  }

  const { error: deleteError } = await supabase
    .from("steps")
    .delete()
    .eq("parent_step_id", parsed.data.parentStepId);

  if (deleteError) {
    res.status(500).json({ error: deleteError.message });
    return;
  }

  const { data: maxOrderRow } = await supabase
    .from("steps")
    .select("order_idx")
    .eq("decomposition_id", decompositionId)
    .order("order_idx", { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseOrderIdx = (maxOrderRow?.order_idx ?? -1) + 1;

  const stepsToInsert = parsed.data.steps.map((step, index) => ({
    decomposition_id: decompositionId,
    parent_step_id: parsed.data.parentStepId,
    order_idx: baseOrderIdx + index,
    title: step.title,
    description: step.description,
    guide: step.guide,
    first_move: step.firstMove,
    unblocker: step.unblocker,
    estimated_minutes: step.estimatedMinutes,
    boundary_signal: step.boundarySignal,
  }));

  const { error: insertError } = await supabase.from("steps").insert(stepsToInsert);
  if (insertError) {
    res.status(500).json({ error: insertError.message });
    return;
  }

  res.status(201).json({ ok: true, count: stepsToInsert.length });
});

// 특정 부모 단계의 모든 하위 단계 삭제 — "전체 취소" 버튼이 호출.
router.delete("/:projectId/sub-steps/:parentStepId", async (req, res) => {
  const { projectId, parentStepId } = req.params;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", req.userId)
    .single();
  if (projectError || !project) {
    res.status(404).json({ error: "프로젝트를 찾을 수 없어요." });
    return;
  }

  const { data: latestDecomp } = await supabase
    .from("decompositions")
    .select("id")
    .eq("project_id", projectId)
    .order("round", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latestDecomp?.id) {
    res.status(400).json({ error: "이 프로젝트에 분해 결과가 없어요." });
    return;
  }

  const { data: parentStep, error: parentError } = await supabase
    .from("steps")
    .select("id")
    .eq("id", parentStepId)
    .eq("decomposition_id", latestDecomp.id)
    .single();
  if (parentError || !parentStep) {
    res.status(404).json({ error: "부모 단계를 찾을 수 없어요." });
    return;
  }

  const { error: deleteError } = await supabase
    .from("steps")
    .delete()
    .eq("parent_step_id", parentStepId);
  if (deleteError) {
    res.status(500).json({ error: deleteError.message });
    return;
  }

  res.status(204).send();
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
