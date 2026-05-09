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

export type { DecomposeApiResponse, DecomposeRequest } from "../schemas/decompose";
