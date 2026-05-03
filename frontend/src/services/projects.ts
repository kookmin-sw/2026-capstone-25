import { supabase } from "../lib/supabase";

// /all 화면에서 쓰는 프로젝트 API 호출 함수 모음.
// 매 요청마다 Supabase access_token을 Authorization 헤더에 붙인다.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export type ProjectSummary = {
  id: string;
  title: string;
  rawInput: string;
  color: string | null;
  due: string | null;
  isSingle: boolean;
  createdAt: string;
  progress: number;
  doneCount: number;
  totalCount: number;
  nextStep: {
    id: string;
    title: string;
    estimatedMinutes: number | null;
  } | null;
};

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("로그인이 필요해요.");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function listProjects() {
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw new Error("프로젝트 목록을 불러오지 못했어요.");
  }

  const data = (await response.json()) as { projects: ProjectSummary[] };
  return data.projects;
}

export async function deleteProject(id: string) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw new Error("프로젝트를 삭제하지 못했어요.");
  }
}
