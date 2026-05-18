// fetch 래퍼와 HTTP 응답 검증 유틸.
// 네트워크 단절·401·422·일반 에러를 한국어 사용자 메시지로 통일하고,
// 401일 때는 로그인 페이지로 강제 이동시킨다.

const NETWORK_ERROR_MESSAGE = "서버에 연결하지 못했어요. 네트워크 상태를 확인해 주세요.";
const VALIDATION_ERROR_MESSAGE = "입력값을 확인해 주세요.";

// fetch 자체가 실패하는 네트워크 오류를 사용자 메시지로 통일한다.
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }
}

// 백엔드가 JSON 또는 text로 내려주는 상세 오류를 가능한 만큼 살려서 보여준다.
async function readErrorDetail(res: Response): Promise<string> {
  try {
    const data = (await res.clone().json()) as { error?: unknown; message?: unknown };
    if (typeof data.error === "string") return data.error;
    if (typeof data.message === "string") return data.message;
  } catch {
    // Fall back to plain text below.
  }

  try {
    return await res.text();
  } catch {
    return "";
  }
}

export async function checkResponse(res: Response, fallbackMessage: string): Promise<void> {
  if (res.ok) return;
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("로그인이 필요해요.");
  }
  if (res.status === 422) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ? `${VALIDATION_ERROR_MESSAGE} ${detail}` : VALIDATION_ERROR_MESSAGE);
  }

  const detail = await readErrorDetail(res);
  throw new Error(detail || fallbackMessage);
}
