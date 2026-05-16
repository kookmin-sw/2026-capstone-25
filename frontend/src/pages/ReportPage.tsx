import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getWeeklyReport, getAiSummary, type WeeklyReport, type AiSummary } from "../services/report";
import AutoComment from "../components/report/AutoComment";
import WeeklySummary from "../components/report/WeeklySummary";
import ProjectBreakdown from "../components/report/ProjectBreakdown";
import UserTypeCard from "../components/report/UserTypeCard";
import PatternCards from "../components/report/PatternCards";
import NextWeekSuggestion from "../components/report/NextWeekSuggestion";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";

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

function hasReportActivity(data: WeeklyReport): boolean {
  return data.projects.length > 0 || data.weeks.some((week) => week.mins > 0 || week.done > 0);
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

        // 빈 계정에는 기본 리포트/AI 문구 대신 명확한 빈 상태를 보여준다.
        if (!hasReportActivity(data)) {
          setAi(null);
          return;
        }

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
    <div className="flex flex-col min-h-full px-[18px] pt-6 pb-6 gap-4">

      {status === "loading" && (
        <LoadingState title="리포트를 불러오고 있어요" className="max-w-[520px]" />
      )}
      {status === "error" && (
        <p className="text-center text-red-400 text-sm mt-6">리포트를 불러오지 못했어요.</p>
      )}
      {status === "ready" && report && (
        hasReportActivity(report) ? (
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
        ) : (
          <EmptyState
            emoji="📊"
            title="아직 리포트가 없어요"
            subtitle="할 일을 만들고 집중 시간을 기록하면 이곳에 흐름이 쌓여요"
          />
        )
      )}
    </div>
  );
}
