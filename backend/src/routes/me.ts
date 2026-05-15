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

// GET /api/me/today-minutes — 오늘(자정 기준) timer_sessions 합산.
router.get("/today-minutes", authMiddleware, async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: sessions, error } = await supabase
    .from("timer_sessions")
    .select("mins")
    .eq("user_id", req.userId)
    .gte("started_at", todayStart.toISOString());

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const total = (sessions ?? []).reduce((sum, s) => sum + (s.mins ?? 0), 0);
  res.json({ minutes: total });
});

export default router;
