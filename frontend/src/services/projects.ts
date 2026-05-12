import { supabase } from "../lib/supabase";

// /all 화면에서 쓰는 프로젝트 API 호출 함수 모음.
// 매 요청마다 Supabase access_token을 Authorization 헤더에 붙인다.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export type ProjectSummary = {
  id: string;
  title: string;
  memo: string | null;
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
  firstMove: string | null;
  unblocker: string | null;
  boundarySignal: string | null;
};

export type ProjectDetail = {
  id: string;
  title: string;
  memo: string | null;
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

// POST /api/projects 요청 본문 — 백엔드 CreateProjectSchema와 모양이 같아야 한다.
// 한쪽을 바꿀 때 양쪽을 함께 갱신할 것 (backend/src/schemas/project.ts).
export type CreateStepInput = {
  title: string;
  description?: string;
  guide?: string;
  firstMove?: string;
  unblocker?: string;
  estimatedMinutes?: number; // 백엔드는 positive int — 0/음수는 보내지 말 것
  boundarySignal?: string;
};

export type CreateProjectInput = {
  title: string;
  memo?: string;
  primaryType?: string;
  secondaryTags?: string[];
  goal: string;
  currentPhase?: string;
  color?: string;
  startDate?: string;
  due?: string;
  isSingle?: boolean;
  scale?: string;
  templateId?: string;
  templateName?: string;
  steps?: CreateStepInput[];
};

export async function createProject(input: CreateProjectInput): Promise<{ id: string }> {
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    // 백엔드는 실패 시 { error: string | flattenedZodError } 반환
    let detail = "";
    try {
      const data = (await response.json()) as { error?: unknown };
      if (typeof data.error === "string") detail = data.error;
    } catch {
      // 응답 본문이 비어 있거나 JSON이 아닐 수 있음 — 무시하고 일반 메시지로
    }
    if (response.status === 401) {
      throw new Error("로그인이 만료되었어요. 다시 로그인해 주세요.");
    }
    throw new Error(detail || "프로젝트를 저장하지 못했어요.");
  }

  return (await response.json()) as { id: string };
}

// 단계 목록을 편집 저장한다 — 새 round decomposition을 생성한다.
export async function editSteps(projectId: string, steps: { id?: string; title: string }[]) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/steps`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify({ steps }),
  });

  if (!response.ok) {
    throw new Error("단계 수정을 저장하지 못했어요.");
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
