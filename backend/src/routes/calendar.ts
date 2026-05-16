// 캘린더 탭 API — schedule_assignments CRUD.
// GET  /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD  : 범위 내 배정 목록
// POST /api/calendar                                 : 단계 날짜 배정
// PATCH /api/calendar/:id                            : 날짜·우선순위 변경
// DELETE /api/calendar/:id                           : 배정 삭제
import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { CreateAssignmentSchema, PatchAssignmentSchema } from "../schemas/calendar.js";

const router = Router();
router.use(authMiddleware);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── GET /api/calendar?from=&to= ──────────────────────────────────────────────
// 지정 날짜 범위의 배정 목록을 step·project 정보와 함께 반환한다.
router.get("/", async (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };

  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    res.status(400).json({ error: "from, to 파라미터가 YYYY-MM-DD 형식이어야 해요." });
    return;
  }

  const { data, error } = await supabase
    .from("schedule_assignments")
    .select(`
      id,
      date,
      priority,
      steps (
        id,
        title,
        done,
        estimated_minutes,
        decompositions (
          projects (
            id,
            title,
            color,
            due
          )
        )
      )
    `)
    .eq("user_id", req.userId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true })
    .order("priority", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Supabase join 결과를 프론트가 쓰기 편한 flat 구조로 정리한다.
  const assignments = (data ?? []).map((row: any) => {
    const step = row.steps ?? {};
    const project = step.decompositions?.projects ?? {};
    return {
      id: row.id,
      date: row.date,
      priority: row.priority,
      step: {
        id: step.id,
        title: step.title,
        done: step.done,
        estimatedMinutes: step.estimated_minutes ?? null,
      },
      project: {
        id: project.id,
        title: project.title ?? project.goal ?? "",
        color: project.color ?? null,
        due: project.due ?? null,
      },
    };
  });

  // D-Day 표시용: 해당 범위에 마감일이 있는 프로젝트 조회
  const { data: dueData } = await supabase
    .from("projects")
    .select("id, title, goal, color, due")
    .eq("user_id", req.userId)
    .gte("due", from)
    .lte("due", to)
    .not("due", "is", null);

  const dueProjects = (dueData ?? []).map((p: any) => ({
    id: p.id,
    title: p.title ?? p.goal ?? "",
    color: p.color ?? null,
    due: p.due,
  }));

  res.json({ assignments, dueProjects });
});

// ── POST /api/calendar ───────────────────────────────────────────────────────
// step을 날짜에 배정한다. 같은 step+date 조합이 이미 있으면 409.
router.post("/", async (req, res) => {
  const parsed = CreateAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) });
    return;
  }

  const { stepId, date, priority } = parsed.data;

  // 소유권 확인 — step → decomposition → project → user_id
  const { data: step, error: stepError } = await supabase
    .from("steps")
    .select("id, decompositions(project_id, projects(user_id))")
    .eq("id", stepId)
    .single();

  if (stepError || !step) {
    res.status(404).json({ error: "단계를 찾을 수 없어요." });
    return;
  }

  const decomposition = (step as any).decompositions as {
    project_id: string;
    projects: { user_id: string };
  } | null;

  if (!decomposition || decomposition.projects.user_id !== req.userId) {
    res.status(403).json({ error: "권한이 없어요." });
    return;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("schedule_assignments")
    .insert({ step_id: stepId, user_id: req.userId, date, priority })
    .select("id")
    .single();

  if (insertError) {
    // unique 위반 등
    res.status(500).json({ error: insertError.message });
    return;
  }

  res.status(201).json({ id: inserted.id });
});

// ── PATCH /api/calendar/:id ──────────────────────────────────────────────────
// 배정 날짜 또는 우선순위를 변경한다.
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = PatchAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) });
    return;
  }

  // 소유권 확인
  const { data: existing, error: findError } = await supabase
    .from("schedule_assignments")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (findError || !existing) {
    res.status(404).json({ error: "배정을 찾을 수 없어요." });
    return;
  }

  if ((existing as any).user_id !== req.userId) {
    res.status(403).json({ error: "권한이 없어요." });
    return;
  }

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.date !== undefined) updatePayload.date = parsed.data.date;
  if (parsed.data.priority !== undefined) updatePayload.priority = parsed.data.priority;

  const { error: updateError } = await supabase
    .from("schedule_assignments")
    .update(updatePayload)
    .eq("id", id);

  if (updateError) {
    res.status(500).json({ error: updateError.message });
    return;
  }

  res.status(204).send();
});

// ── DELETE /api/calendar/:id ─────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const { data: existing, error: findError } = await supabase
    .from("schedule_assignments")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (findError || !existing) {
    res.status(404).json({ error: "배정을 찾을 수 없어요." });
    return;
  }

  if ((existing as any).user_id !== req.userId) {
    res.status(403).json({ error: "권한이 없어요." });
    return;
  }

  const { error: deleteError } = await supabase
    .from("schedule_assignments")
    .delete()
    .eq("id", id);

  if (deleteError) {
    res.status(500).json({ error: deleteError.message });
    return;
  }

  res.status(204).send();
});

export default router;
