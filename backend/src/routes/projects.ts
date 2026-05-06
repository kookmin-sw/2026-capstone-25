import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { CreateProjectSchema, CreateStepSchema } from "../schemas/project.js";

// 전체 탭에서 쓰는 프로젝트 API.
// 프로젝트 생성, 목록 조회, 삭제를 담당한다.
const router = Router();

type ProjectRow = {
  id: string;
  raw_input: string;
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

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const userId = req.userId;

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, raw_input, goal, color, due, is_single, created_at")
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
        title: project.goal,
        rawInput: project.raw_input,
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
      raw_input: input.rawInput,
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
