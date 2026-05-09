import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { PatchStepSchema } from "../schemas/step.js";

// 단계(step) 관련 API. 현재는 완료 여부 토글만 제공한다.
const router = Router();

router.use(authMiddleware);

// PATCH /api/steps/:id — done 토글.
// 본인 소유 step인지 확인 후 done 값을 업데이트한다.
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = PatchStepSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) });
    return;
  }

  // 소유권 확인: step → decomposition → project → user_id
  const { data: step, error: stepError } = await supabase
    .from("steps")
    .select("id, decompositions(project_id, projects(user_id))")
    .eq("id", id)
    .single();

  if (stepError || !step) {
    res.status(404).json({ error: "단계를 찾을 수 없어요." });
    return;
  }

  // 타입 단언 — Supabase join 결과를 꺼낸다
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
    .update({ done: parsed.data.done })
    .eq("id", id);

  if (updateError) {
    res.status(500).json({ error: updateError.message });
    return;
  }

  res.status(204).send();
});

export default router;
