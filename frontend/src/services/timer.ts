import { supabase } from "../lib/supabase";
import { apiFetch, checkResponse } from "../lib/api";

// 타이머 관련 API 호출 함수 모음.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("로그인이 필요해요.");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// 집중 시간을 단계에 누적한다. minutes는 1 이상 정수.
export async function postTimeSpent(stepId: string, minutes: number) {
  const response = await apiFetch(`${API_BASE_URL}/api/steps/${stepId}/time`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ minutes }),
  });
  await checkResponse(response, "시간 저장에 실패했어요.");
}

// 오늘 누적 집중 시간(분)을 조회한다.
export async function getTodayMinutes(): Promise<number> {
  const response = await apiFetch(`${API_BASE_URL}/api/me/today-minutes`, {
    headers: await authHeaders(),
  });
  await checkResponse(response, "오늘 집중 시간을 불러오지 못했어요.");
  const data = (await response.json()) as { minutes: number };
  return data.minutes;
}
