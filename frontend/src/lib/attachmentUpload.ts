// 분해 입력에 첨부할 파일의 클라이언트측 검증·업로드·정리 유틸.
// 백엔드 schemas/decompose 의 superRefine 규칙을 거울처럼 적용해 1차 차단하고,
// 통과한 파일만 Supabase Storage(`decompose-attachments` 버킷)로 올린 뒤 AttachmentRef 배열을 돌려준다.
// 같은 내용은 같은 객체 경로(hash prefix)로 떨어지도록 해 재시도가 idempotent 하다.

import { supabase } from "./supabase";
import {
  ATTACHMENT_ALLOWED_MIME,
  ATTACHMENT_EXT_TO_MIME,
  ATTACHMENT_MAX_BYTES_PER_FILE,
  ATTACHMENT_MAX_BYTES_TOTAL,
  ATTACHMENT_MAX_COUNT,
  type AttachmentMime,
  type AttachmentRef,
} from "../schemas/decompose";

// 분해 입력에 동봉할 파일을 Supabase Storage 에 업로드한다.
// 객체 경로: {userId}/{sessionId}/{hash}-{filename}
//   - userId: RLS 정책 검사 키
//   - sessionId: 같은 분해 세션의 파일들을 묶어 cleanup 단위로 활용
//   - hash: 같은 내용의 파일이 중복 업로드돼도 같은 객체에 도달하도록(idempotent)

const BUCKET = "decompose-attachments";

export class AttachmentValidationError extends Error {}
export class AttachmentUploadError extends Error {}

// 브라우저 SHA-256. 파일 객체명 prefix 로 사용해 같은 내용은 같은 경로가 되도록.
async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// File.type 이 비어 있는 케이스(특히 .md) 까지 커버하는 MIME 추정.
function detectMime(file: File): AttachmentMime | null {
  if ((ATTACHMENT_ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return file.type as AttachmentMime;
  }
  const dot = file.name.lastIndexOf(".");
  if (dot < 0) return null;
  const ext = file.name.slice(dot).toLowerCase();
  return ATTACHMENT_EXT_TO_MIME[ext] ?? null;
}

// 클라이언트 선검증. 백엔드 superRefine 과 동일 규칙을 거울처럼 적용한다.
export function validateAttachments(files: File[]): { valid: true } | { valid: false; reason: string } {
  if (files.length === 0) return { valid: true };
  if (files.length > ATTACHMENT_MAX_COUNT) {
    return { valid: false, reason: `첨부는 최대 ${ATTACHMENT_MAX_COUNT}개까지 가능해요.` };
  }
  let total = 0;
  for (const f of files) {
    if (f.size > ATTACHMENT_MAX_BYTES_PER_FILE) {
      return {
        valid: false,
        reason: `${f.name} 파일이 너무 커요. 1개당 최대 ${Math.round(ATTACHMENT_MAX_BYTES_PER_FILE / (1024 * 1024))}MB.`,
      };
    }
    if (!detectMime(f)) {
      return { valid: false, reason: `${f.name} 은(는) 지원하지 않는 형식이에요.` };
    }
    total += f.size;
  }
  if (total > ATTACHMENT_MAX_BYTES_TOTAL) {
    return {
      valid: false,
      reason: `첨부 파일 총합이 ${Math.round(ATTACHMENT_MAX_BYTES_TOTAL / (1024 * 1024))}MB 를 넘어요.`,
    };
  }
  return { valid: true };
}

export type UploadInput = {
  userId: string;
  sessionId: string;
  files: File[];
};

export async function uploadAttachments({ userId, sessionId, files }: UploadInput): Promise<AttachmentRef[]> {
  const check = validateAttachments(files);
  if (!check.valid) throw new AttachmentValidationError(check.reason);

  const refs: AttachmentRef[] = [];
  for (const file of files) {
    const mime = detectMime(file);
    if (!mime) {
      throw new AttachmentValidationError(`${file.name} 은(는) 지원하지 않는 형식이에요.`);
    }
    const hash = await sha256Hex(file);
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${userId}/${sessionId}/${hash}-${safeName}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: mime,
      upsert: true,
    });
    if (error) {
      throw new AttachmentUploadError(`${file.name} 업로드 실패: ${error.message}`);
    }

    refs.push({ path, filename: file.name, contentType: mime, size: file.size });
  }
  return refs;
}

// 확정 저장 성공 / 돌아가기 시 호출. 실패해도 silently 무시 (RLS 정책으로 본인 파일만 지워짐).
export async function removeAttachments(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(BUCKET).remove(paths);
  } catch {
    // 청소 실패는 사용자 흐름을 막지 않는다. 추후 cron 또는 다음 업로드 시 자연 정리.
  }
}
