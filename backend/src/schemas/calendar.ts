// calendar 라우트 요청 본문 스키마.
// 프론트엔드 services/calendar.ts 의 타입과 모양이 같아야 한다.
import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Postgres uuid 타입이 허용하는 8-4-4-4-12 형식만 확인한다.
// 데모 시드의 식별자는 RFC version/variant nibble을 따르지 않아 z.string().uuid()보다 완화된 검증이 필요하다.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/calendar — 단계를 날짜에 배정
export const CreateAssignmentSchema = z.object({
  stepId: z.string().regex(UUID_RE, "UUID 형식이어야 해요."),
  date: z.string().regex(DATE_RE, "YYYY-MM-DD 형식이어야 해요."),
  priority: z.number().int().optional().default(0),
});

// PATCH /api/calendar/:id — 날짜 또는 우선순위 변경 (둘 중 하나 이상 필요)
export const PatchAssignmentSchema = z
  .object({
    date: z.string().regex(DATE_RE, "YYYY-MM-DD 형식이어야 해요.").optional(),
    priority: z.number().int().optional(),
  })
  .refine((d) => d.date !== undefined || d.priority !== undefined, {
    message: "date 또는 priority 중 하나 이상 필요해요.",
  });
