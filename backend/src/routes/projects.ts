import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { CreateProjectSchema, CreateStepSchema, CreateSubStepsSchema, EditStepsSchema } from "../schemas/project.js";

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
      .select("id, decomposition_id, parent_step_id, order_idx, title, done, estimated_minutes, description, guide, first_move, unblocker, boundary_signal")
      .eq("decomposition_id", decompositionId)
      .order("order_idx", { ascending: true });

    if (stepsError) {
      res.status(500).json({ error: stepsError.message });
      return;
    }

    steps.push(...((stepData ?? []) as StepDetailRow[]));
  }

  // 진행률은 1차 단계(부모 없음)만 카운트한다 — 2차(하위) 단계는 부모 단계 완료 여부로 흡수된다.
  const topLevelSteps = steps.filter((s) => s.parent_step_id === null);
  const doneCount = topLevelSteps.filter((s) => s.done).length;
  const totalCount = topLevelSteps.length;
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

  // 1차 단계 insert — id를 받아 자식 insert 시 parent_step_id로 연결한다.
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

  // 2차(자식) 단계 insert — 부모 insert 결과 순서(returning은 insert 순서 보장)로 매핑.
  // order_idx는 1차 마지막 + 자식 순서로 부여해 모두 같은 decomposition 안에서 유니크하게 만든다.
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

  // 기존 단계 메타데이터 조회 (id 있는 단계에 복사하기 위해 — 가이드/예상시간 등 유지)
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

  // 1차(부모) 단계 insert — id를 받아 자식 insert 시 parent_step_id로 연결한다.
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

  // 2차(자식) 단계 insert — 부모 returning 순서로 parent_step_id 매핑.
  // order_idx는 1차 마지막 + 자식 순서로 부여해 같은 decomposition 안에서 유니크하게 한다.
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

// 2차 분해 결과(하위 단계)를 부모 단계의 decomposition_id에 누적 insert 한다.
// 본인 프로젝트인지 + parentStepId가 그 프로젝트에 속하는지 검증한다.
// 같은 decomposition_id를 공유하므로 GET 응답의 최신 round 한 줄로 1차+2차 모두 노출된다.
router.post("/:projectId/sub-steps", async (req, res) => {
  const { projectId } = req.params;
  const parsed = CreateSubStepsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) });
    return;
  }

  // 1) 프로젝트 소유권 확인
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

  // 2) parent step이 이 프로젝트의 최신 decomposition에 속하는지 확인
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

  // 2차 분해까지만 허용 — 부모 단계가 이미 자식이면 거부
  if (parentStep.parent_step_id !== null) {
    res.status(400).json({ error: "2차까지만 분해할 수 있어요." });
    return;
  }

  // 3) 기존 하위 단계가 있으면 통째로 교체 (재분해 시나리오)
  const { error: deleteError } = await supabase
    .from("steps")
    .delete()
    .eq("parent_step_id", parsed.data.parentStepId);

  if (deleteError) {
    res.status(500).json({ error: deleteError.message });
    return;
  }

  // 4) 새 하위 단계 insert — order_idx는 받은 배열 순서 그대로
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
// 본인 프로젝트인지 + parentStepId가 그 프로젝트에 속하는지 확인 후 자식만 제거(부모는 유지).
router.delete("/:projectId/sub-steps/:parentStepId", async (req, res) => {
  const { projectId, parentStepId } = req.params;

  // 프로젝트 소유권 확인
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

  // 최신 decomposition 안의 parent step인지 확인
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
