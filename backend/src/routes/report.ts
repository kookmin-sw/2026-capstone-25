// 리포트 탭 API
// GET  /api/report/weekly     — 4주 추이 + 프로젝트별 집계
// POST /api/report/ai-summary — 집계 데이터 → Claude 자기이해형 인사이트 생성
import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";
import { authMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { buildReportUserPrompt } from "../prompts/report-ai.js";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const router = Router();
router.use(authMiddleware);

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // 일요일 기준
  return d;
}

function toISOStr(d: Date): string {
  return d.toISOString();
}

// GET /api/report/weekly
router.get("/weekly", async (req, res) => {
  const userId = req.userId;

  // 4주 범위 계산
  const now = new Date();
  const thisWeekStart = getWeekStart(now);
  const fourWeeksAgo = new Date(thisWeekStart);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 21);

  // ── 1. 4주간 timer_sessions 조회 ─────────────────────────────────────────
  const { data: sessions } = await supabase
    .from("timer_sessions")
    .select("mins, started_at, step_id")
    .eq("user_id", userId)
    .gte("started_at", toISOStr(fourWeeksAgo));

  // ── 2. 4주간 완료된 steps 조회 (updated_at 기준) ──────────────────────────
  const { data: doneSteps } = await supabase
    .from("steps")
    .select(`
      id,
      updated_at,
      parent_step_id,
      estimated_minutes,
      time_spent,
      decompositions (
        project_id,
        projects ( id, title, color, due )
      )
    `)
    .eq("done", true)
    .gte("updated_at", toISOStr(fourWeeksAgo))
    .not("decompositions.projects.user_id", "is", null);

  // user 소유 필터 (RLS가 처리하지만 join 결과 방어)
  const ownDoneSteps = (doneSteps ?? []).filter((s: any) => {
    const proj = s.decompositions?.projects;
    return proj != null;
  });

  // ── 3. 전체 프로젝트 현황 조회 (진행 중인 것) ────────────────────────────
  const { data: projects } = await supabase
    .from("projects")
    .select(`
      id, title, color, due, created_at,
      decompositions (
        id,
        steps ( id, done, parent_step_id, time_spent, estimated_minutes )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // ── 4. 4주 차트 데이터 계산 ──────────────────────────────────────────────
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() - (3 - i) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end, mins: 0, done: 0 };
  });

  for (const s of sessions ?? []) {
    const t = new Date(s.started_at);
    const w = weeks.find((w) => t >= w.start && t < w.end);
    if (w) w.mins += s.mins;
  }
  for (const s of ownDoneSteps) {
    const t = new Date((s as any).updated_at);
    const w = weeks.find((w) => t >= w.start && t < w.end);
    if (w) w.done += 1;
  }

  const weekLabels = ["3주 전", "2주 전", "지난주", "이번 주"];
  const weeksResult = weeks.map((w, i) => ({
    label: weekLabels[i],
    mins: w.mins,
    done: w.done,
  }));

  // ── 5. 프로젝트별 집계 ───────────────────────────────────────────────────
  const projectStats = (projects ?? []).map((p: any) => {
    // 최신 decomposition만 사용 (round가 가장 높은 것)
    const decomps = p.decompositions ?? [];
    const allSteps = decomps.flatMap((d: any) => d.steps ?? []);
    const topLevel = allSteps.filter((s: any) => s.parent_step_id === null);
    const totalCount = topLevel.length;
    const doneCount = topLevel.filter((s: any) => s.done).length;
    const timeSpent = allSteps.reduce((sum: number, s: any) => sum + (s.time_spent ?? 0), 0);

    // 마감 페이스 예측
    let pacePrediction: string | null = null;
    if (p.due && totalCount > 0) {
      const today = new Date();
      const due = new Date(p.due);
      const daysLeft = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
      const remaining = totalCount - doneCount;
      if (daysLeft > 0 && doneCount > 0) {
        const createdAt = new Date(p.created_at);
        const daysPassed = Math.max(1, Math.ceil((today.getTime() - createdAt.getTime()) / 86_400_000));
        const ratePerDay = doneCount / daysPassed;
        const estimatedDaysNeeded = remaining / ratePerDay;
        if (estimatedDaysNeeded <= daysLeft) {
          pacePrediction = "이 속도면 마감 내 완료 가능해요";
        } else {
          const over = Math.ceil(estimatedDaysNeeded - daysLeft);
          pacePrediction = `이 속도면 마감보다 ${over}일 초과될 수 있어요`;
        }
      } else if (daysLeft <= 3 && remaining > 0) {
        pacePrediction = `마감까지 ${daysLeft}일, ${remaining}개 남았어요`;
      }
    }

    return {
      id: p.id,
      title: p.title ?? "",
      color: p.color ?? null,
      due: p.due ?? null,
      totalCount,
      doneCount,
      progress: totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100),
      timeSpent,
      pacePrediction,
    };
  });

  // ── 6. 사용자 타입 분석 ──────────────────────────────────────────────────
  const userType = analyzeUserType({
    weeks: weeksResult,
    sessions: sessions ?? [],
    doneSteps: ownDoneSteps,
    projects: projects ?? [],
  });

  res.json({
    weeks: weeksResult,
    projects: projectStats,
    userType,
  });
});

// ── POST /api/report/ai-summary ─────────────────────────────────────────────
// 프론트에서 weekly 데이터를 보내면 Claude가 자기이해형 인사이트를 생성해 반환한다.
router.post("/ai-summary", async (req, res) => {
  const { weeks, projects } = req.body as {
    weeks: { label: string; mins: number; done: number }[];
    projects: { id: string; title: string; progress: number; timeSpent: number; due: string | null; doneCount: number; totalCount: number }[];
  };

  if (!weeks || !projects) {
    res.status(400).json({ error: "weeks, projects 데이터가 필요해요." });
    return;
  }

  // 타이머 세션 시간대 분포 조회 (hour 0~23 카운트)
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const { data: sessions } = await supabase
    .from("timer_sessions")
    .select("started_at, mins")
    .eq("user_id", req.userId)
    .gte("started_at", fourWeeksAgo.toISOString());

  const hourDist: number[] = Array(24).fill(0);
  for (const s of sessions ?? []) {
    const h = new Date(s.started_at).getHours();
    hourDist[h] += s.mins;
  }
  const peakHour = hourDist.indexOf(Math.max(...hourDist));
  const peakLabel =
    peakHour < 6 ? "새벽" : peakHour < 12 ? "오전" : peakHour < 18 ? "오후" : "저녁·밤";

  // Claude 프롬프트 구성
  const weeksText = weeks
    .map((w) => `${w.label}: 집중 ${w.mins}분, 완료 ${w.done}개`)
    .join(" / ");

  const projectsText = projects
    .map((p) => {
      const due = p.due ? `마감 ${p.due}` : "마감 없음";
      return `- ${p.title}: 진행률 ${p.progress}% (${p.doneCount}/${p.totalCount}단계), 집중 ${p.timeSpent}분, ${due}`;
    })
    .join("\n");

  const hasSessions = (sessions ?? []).length > 0;
  const timeContext = hasSessions
    ? `집중 시간대: ${peakLabel}(${peakHour}시) 대에 가장 많이 집중했어요.`
    : "타이머 기록이 아직 없어요.";

  const userPrompt = buildReportUserPrompt({ weeksText, projectsText, timeContext });

  try {
    const message = await anthropic.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "AI 응답 파싱 실패" });
      return;
    }
    const summary = JSON.parse(jsonMatch[0]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: "AI 분석 중 오류가 발생했어요." });
  }
});

// 규칙 기반 사용자 타입 분석
function analyzeUserType({ weeks, doneSteps }: {
  weeks: { mins: number; done: number }[];
  sessions?: any[];
  doneSteps: any[];
  projects?: any[];
}): { type: string; emoji: string; description: string } {
  // 마감 부스터형: due 임박 프로젝트의 최근 완료 비율이 높은 경우
  const urgentDone = doneSteps.filter((s: any) => {
    const due = s.decompositions?.projects?.due;
    if (!due) return false;
    const daysLeft = Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
    return daysLeft >= 0 && daysLeft <= 7;
  }).length;
  if (urgentDone >= 3) {
    return { type: "마감 부스터형", emoji: "🔥", description: "마감이 가까울수록 집중력이 올라가요" };
  }

  // 작은 단위 선호형: 2차 단계(parent 있는 것) 완료 비율이 1차보다 높은 경우
  const subDone = doneSteps.filter((s: any) => s.parent_step_id !== null).length;
  const topDone = doneSteps.filter((s: any) => s.parent_step_id === null).length;
  if (subDone > topDone && subDone >= 3) {
    return { type: "작은 단위 선호형", emoji: "🧩", description: "잘게 쪼갠 작업을 꾸준히 완료하는 스타일이에요" };
  }

  // 꾸준형: 4주 모두 done > 0이고 편차가 작은 경우
  const allActive = weeks.every((w) => w.done > 0);
  const maxDone = Math.max(...weeks.map((w) => w.done));
  const minDone = Math.min(...weeks.map((w) => w.done));
  if (allActive && maxDone - minDone <= 3) {
    return { type: "꾸준형", emoji: "🐢", description: "매주 빠짐없이 조금씩 나아가는 스타일이에요" };
  }

  // 몰입형: 집중 시간은 많은데 완료 빈도가 낮은 경우
  const totalMins = weeks.reduce((s, w) => s + w.mins, 0);
  const totalDone = weeks.reduce((s, w) => s + w.done, 0);
  if (totalMins >= 120 && totalDone <= 2) {
    return { type: "몰입형", emoji: "🎯", description: "한 번 시작하면 오래 집중하는 스타일이에요" };
  }

  // 기본
  return { type: "한 발짝씩 나아가는 중", emoji: "🌱", description: "조금씩 쌓아가고 있어요" };
}

export default router;
