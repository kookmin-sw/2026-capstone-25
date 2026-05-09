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

export type StepDetail = {
  id: string;
  orderIdx: number;
  title: string;
  done: boolean;
  estimatedMinutes: number | null;
  description: string | null;
  guide: string | null;
  boundarySignal: string | null;
};

export type ProjectDetail = {
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
  steps: StepDetail[];
};

// 프로젝트 단건 상세 조회 — 단계 가이드 포함 전체 정보를 반환한다.
export async function getProject(id: string): Promise<ProjectDetail> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw new Error("프로젝트를 불러오지 못했어요.");
  }

  return (await response.json()) as ProjectDetail;
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

// 단계 완료 여부를 토글한다. done: true → 완료, false → 미완료.
export async function toggleStep(id: string, done: boolean) {
  const response = await fetch(`${API_BASE_URL}/api/steps/${id}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify({ done }),
  });

  if (!response.ok) {
    throw new Error("단계 상태를 변경하지 못했어요.");
  }
}
