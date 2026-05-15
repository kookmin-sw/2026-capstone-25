import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getWeeklyReport, getAiSummary, type WeeklyReport, type AiSummary } from "../services/report";
import AutoComment from "../components/report/AutoComment";
import WeeklySummary from "../components/report/WeeklySummary";
import ProjectBreakdown from "../components/report/ProjectBreakdown";
import UserTypeCard from "../components/report/UserTypeCard";
import PatternCards from "../components/report/PatternCards";
import NextWeekSuggestion from "../components/report/NextWeekSuggestion";

function getWeekKey(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function loadCachedAi(userId: string): AiSummary | null {
  try {
    const key = `ai-report-${getWeekKey()}-${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as AiSummary;
  } catch {
    return null;
  }
}

function saveCachedAi(userId: string, data: AiSummary) {
  try {
    const key = `ai-report-${getWeekKey()}-${userId}`;
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // storage full 등 무시
  }
}

export default function ReportPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [ai, setAi] = useState<AiSummary | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getWeeklyReport();
        if (cancelled) return;
        setReport(data);
        setStatus("ready");

        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id ?? "anon";

        const cached = loadCachedAi(userId);
        if (cached) {
          setAi(cached);
          return;
        }

        setAiLoading(true);
        try {
          const summary = await getAiSummary(data.weeks, data.projects);
          if (!cancelled) {
            setAi(summary);
            saveCachedAi(userId, summary);
          }
        } catch {
          // AI 실패는 소리 없이 처리 — 규칙 기반 fallback 유지
        } finally {
          if (!cancelled) setAiLoading(false);
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col min-h-full bg-bg px-[22px] pt-6 pb-6 gap-4">
      <span className="text-[22px] font-bold text-tx tracking-[-0.3px]">리포트</span>

      {status === "loading" && (
        <p className="text-center text-mu text-sm mt-6">불러오는 중...</p>
      )}
      {status === "error" && (
        <p className="text-center text-red-400 text-sm mt-6">리포트를 불러오지 못했어요.</p>
      )}
      {status === "ready" && report && (
        <>
          <AutoComment ai={ai} loading={aiLoading} />
          <UserTypeCard ai={ai} loading={aiLoading} />
          <PatternCards patterns={ai?.patterns ?? null} loading={aiLoading} />
          <WeeklySummary weeks={report.weeks} />
          <ProjectBreakdown projects={report.projects} />
          <NextWeekSuggestion
            strategies={ai?.strategies ?? null}
            loading={aiLoading}
          />
        </>
      )}
    </div>
  );
}
