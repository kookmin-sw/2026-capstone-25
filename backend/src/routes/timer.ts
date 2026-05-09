import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";

// 타이머 관련 API — 집중 시간을 단계에 누적한다.
const router = Router();

router.use(authMiddleware);

// POST /api/steps/:id/time — 집중 시간(분) 누적.
// 소유권 검증 후 time_spent += minutes.
router.post("/steps/:id/time", async (req, res) => {
  const { id } = req.params;

  const parsed = z.object({ minutes: z.number().int().positive() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "minutes는 1 이상의 정수여야 해요." });
    return;
  }

  // 소유권 확인: step → decomposition → project → user_id
  const { data: step, error: stepError } = await supabase
    .from("steps")
    .select("id, time_spent, decompositions(project_id, projects(user_id))")
    .eq("id", id)
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

  const { error: updateError } = await supabase
    .from("steps")
    .update({ time_spent: (step as any).time_spent + parsed.data.minutes })
    .eq("id", id);

  if (updateError) {
    res.status(500).json({ error: updateError.message });
    return;
  }

  res.status(204).send();
});

export default router;
