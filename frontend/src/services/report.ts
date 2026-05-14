import { supabase } from "../lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("로그인이 필요해요.");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export type WeekData = { label: string; mins: number; done: number };

export type ProjectReport = {
  id: string;
  title: string;
  color: string | null;
  due: string | null;
  totalCount: number;
  doneCount: number;
  progress: number;
  timeSpent: number;
  pacePrediction: string | null;
};

export type UserType = { type: string; emoji: string; description: string };

export type WeeklyReport = {
  weeks: WeekData[];
  projects: ProjectReport[];
  userType: UserType;
};

export type AiPattern = { emoji: string; title: string; body: string };

export type AiSummary = {
  headline: string;
  goods: string[];
  bads: string[];
  userType: { type: string; emoji: string; reason: string };
  patterns: AiPattern[];
  projectFlows: Record<string, string>;
  strategies: string[];
};

export async function getWeeklyReport(): Promise<WeeklyReport> {
  const response = await fetch(`${API_BASE_URL}/api/report/weekly`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error("리포트를 불러오지 못했어요.");
  return (await response.json()) as WeeklyReport;
}

export async function getAiSummary(
  weeks: WeekData[],
  projects: ProjectReport[],
): Promise<AiSummary> {
  const response = await fetch(`${API_BASE_URL}/api/report/ai-summary`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ weeks, projects }),
  });
  if (!response.ok) throw new Error("AI 분석에 실패했어요.");
  return (await response.json()) as AiSummary;
}
