import { supabase } from "../lib/supabase";
import {
  DecomposeApiResponseSchema,
  type DecomposeApiResponse,
  type DecomposeRequest,
} from "../schemas/decompose";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function decompose(input: DecomposeRequest): Promise<DecomposeApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/decompose`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`AI 분해 요청이 실패했어요. (${response.status}) ${detail}`);
  }

  const json = (await response.json()) as unknown;
  // 응답 모양이 스키마와 다르면 화면 렌더 전에 명확하게 끊어준다.
  return DecomposeApiResponseSchema.parse(json);
}

// 2차 분해 — 부모 단계 하나를 그 안에서 다시 끊는다.
// 백엔드 SubDecomposeRequestSchema 모양에 맞춰 snake_case로 변환해 보낸다.
export type SubDecomposeInput = {
  parentStepId: string;
  parentStepTitle: string;
  parentStepDescription: string;
  parentGoal: string;
  memo?: string;
};

export async function decomposeSub(input: SubDecomposeInput): Promise<DecomposeApiResponse> {
  const body = {
    parent: {
      step_id: input.parentStepId,
      step_title: input.parentStepTitle,
      step_description: input.parentStepDescription,
      parent_goal: input.parentGoal,
    },
    memo: input.memo,
  };

  const response = await fetch(`${API_BASE_URL}/api/decompose/sub`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`2단계 쪼개기에 실패했어요. (${response.status}) ${detail}`);
  }

  const json = (await response.json()) as unknown;
  return DecomposeApiResponseSchema.parse(json);
}

export type { DecomposeApiResponse, DecomposeRequest } from "../schemas/decompose";
