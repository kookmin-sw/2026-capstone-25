import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";

// 사용자 계정 관련 API.
const router = Router();

router.get("/", authMiddleware, (req, res) => {
  res.json({
    id: req.userId,
    email: req.userEmail,
  });
});

// GET /api/me/today-minutes — 사용자의 전체 단계 time_spent 합산.
// 오늘 집중한 시간을 헤더에 표시하기 위해 사용한다.
router.get("/today-minutes", authMiddleware, async (req, res) => {
  // 본인 프로젝트의 decomposition id 목록 조회
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", req.userId);

  if (projectsError) {
    res.status(500).json({ error: projectsError.message });
    return;
  }

  const projectIds = (projects ?? []).map((p) => p.id);
  if (projectIds.length === 0) {
    res.json({ minutes: 0 });
    return;
  }

  const { data: decompositions, error: decompError } = await supabase
    .from("decompositions")
    .select("id")
    .in("project_id", projectIds);

  if (decompError) {
    res.status(500).json({ error: decompError.message });
    return;
  }

  const decompIds = (decompositions ?? []).map((d) => d.id);
  if (decompIds.length === 0) {
    res.json({ minutes: 0 });
    return;
  }

  const { data: steps, error: stepsError } = await supabase
    .from("steps")
    .select("time_spent")
    .in("decomposition_id", decompIds);

  if (stepsError) {
    res.status(500).json({ error: stepsError.message });
    return;
  }

  const total = (steps ?? []).reduce((sum, s) => sum + (s.time_spent ?? 0), 0);
  res.json({ minutes: total });
});

export default router;
