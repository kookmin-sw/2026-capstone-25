// 캘린더 탭 API 호출 함수 모음.
// 백엔드 /api/calendar 라우트와 1:1 대응한다.
import { supabase } from "../lib/supabase";
import { apiFetch, checkResponse } from "../lib/api";

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

// GET /api/calendar?from=&to= 응답 타입
export type CalendarAssignment = {
  id: string;
  date: string;         // YYYY-MM-DD
  priority: number;
  step: {
    id: string;
    title: string;
    done: boolean;
    estimatedMinutes: number | null;
  };
  project: {
    id: string;
    title: string;
    color: string | null;
  };
};

// 해당 기간 내 마감일이 있는 프로젝트 (D-Day 뱃지용)
export type DueProject = {
  id: string;
  title: string;
  color: string | null;
  due: string; // YYYY-MM-DD
};

export type CalendarData = {
  assignments: CalendarAssignment[];
  dueProjects: DueProject[];
};

// 날짜 범위의 배정 목록 + 마감일 프로젝트 조회
export async function listAssignments(from: string, to: string): Promise<CalendarData> {
  const response = await apiFetch(
    `${API_BASE_URL}/api/calendar?from=${from}&to=${to}`,
    { headers: await authHeaders() },
  );
  await checkResponse(response, "일정을 불러오지 못했어요.");
  return (await response.json()) as CalendarData;
}

// 단계를 날짜에 배정
export async function createAssignment(
  stepId: string,
  date: string,
  priority = 0,
): Promise<{ id: string }> {
  const response = await apiFetch(`${API_BASE_URL}/api/calendar`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ stepId, date, priority }),
  });
  await checkResponse(response, "일정 배정에 실패했어요.");
  return (await response.json()) as { id: string };
}

// 배정 날짜 또는 우선순위 변경
export async function patchAssignment(
  id: string,
  payload: { date?: string; priority?: number },
): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/api/calendar/${id}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  await checkResponse(response, "일정 변경에 실패했어요.");
}

// 배정 삭제
export async function deleteAssignment(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/api/calendar/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  await checkResponse(response, "일정 삭제에 실패했어요.");
}
