import { supabase } from "../lib/supabase";
import { apiFetch, checkResponse } from "../lib/api";

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
  const response = await apiFetch(`${API_BASE_URL}/api/projects`, {
    headers: await authHeaders(),
  });

  await checkResponse(response, "프로젝트 목록을 불러오지 못했어요.");

  const data = (await response.json()) as { projects: ProjectSummary[] };
  return data.projects;
}

export type StepDetail = {
  id: string;
  parentStepId: string | null;
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
  startDate: string | null;
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
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${id}`, {
    headers: await authHeaders(),
  });

  await checkResponse(response, "프로젝트를 불러오지 못했어요.");

  return (await response.json()) as ProjectDetail;
}

export async function deleteProject(id: string) {
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });

  await checkResponse(response, "프로젝트를 삭제하지 못했어요.");
}

// POST /api/projects 요청 본문 — 백엔드 CreateProjectSchema와 모양이 같아야 한다.
// 한쪽을 바꿀 때 양쪽을 함께 갱신할 것 (backend/src/schemas/project.ts).
// children: 결과 화면에서 만든 2차 분해 결과. 깊이는 2차까지(자식은 children을 갖지 않음).
export type CreateStepInput = {
  title: string;
  description?: string;
  guide?: string;
  firstMove?: string;
  unblocker?: string;
  estimatedMinutes?: number; // 백엔드는 positive int — 0/음수는 보내지 말 것
  boundarySignal?: string;
  children?: CreateStepInput[];
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
  const response = await apiFetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });

  await checkResponse(response, "프로젝트를 저장하지 못했어요.");

  return (await response.json()) as { id: string };
}

// 2차 분해 결과를 부모 단계 밑에 저장한다.
// 기존 하위가 있으면 통째로 교체된다(재분해 시나리오).
export async function saveSubSteps(
  projectId: string,
  parentStepId: string,
  steps: CreateStepInput[],
) {
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${projectId}/sub-steps`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ parentStepId, steps }),
  });

  await checkResponse(response, "하위 단계를 저장하지 못했어요.");
}

// 단계 인라인 편집 — 트리 구조(1차 + 자식 children)를 그대로 보낸다.
// 백엔드는 새 round decomposition을 생성하고 부모→자식 순으로 insert (parent_step_id 연결).
export type EditStepInput = {
  id?: string;
  title: string;
  children?: EditStepInput[];
};

export async function editSteps(
  projectId: string,
  steps: EditStepInput[],
  meta?: { title?: string; startDate?: string | null; due?: string | null },
) {
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${projectId}/steps`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify({ steps, ...meta }),
  });

  await checkResponse(response, "단계 수정을 저장하지 못했어요.");
}

// 프로젝트 버전(round) 목록을 조회한다 — 최신 3개.
export type RoundInfo = {
  round: number;
  decompositionId: string;
  trigger: string;
  createdAt: string;
  stepCount: number;
};

export async function listRounds(projectId: string): Promise<RoundInfo[]> {
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${projectId}/rounds`, {
    headers: await authHeaders(),
  });
  await checkResponse(response, "버전 목록을 불러오지 못했어요.");
  const data = (await response.json()) as { rounds: RoundInfo[] };
  return data.rounds;
}

// 특정 round를 최신으로 복원한다 — 해당 round의 단계가 새 round로 복사된다.
export async function restoreRound(projectId: string, round: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${projectId}/rounds/${round}/restore`, {
    method: "POST",
    headers: await authHeaders(),
  });
  await checkResponse(response, "버전 복원에 실패했어요.");
}

// 특정 부모 단계의 모든 하위 단계 삭제 — 상세 화면 자식 박스의 "전체 취소" 버튼이 호출.
export async function deleteSubSteps(projectId: string, parentStepId: string) {
  const response = await apiFetch(
    `${API_BASE_URL}/api/projects/${projectId}/sub-steps/${parentStepId}`,
    {
      method: "DELETE",
      headers: await authHeaders(),
    },
  );

  await checkResponse(response, "하위 단계 취소에 실패했어요.");
}

// 단계 완료 여부를 토글한다. done: true → 완료, false → 미완료.
export async function toggleStep(id: string, done: boolean) {
  const response = await apiFetch(`${API_BASE_URL}/api/steps/${id}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify({ done }),
  });

  await checkResponse(response, "단계 상태를 변경하지 못했어요.");
}
