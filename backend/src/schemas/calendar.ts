// calendar 라우트 요청 본문 스키마.
// 프론트엔드 services/calendar.ts 의 타입과 모양이 같아야 한다.
import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// POST /api/calendar — 단계를 날짜에 배정
export const CreateAssignmentSchema = z.object({
  stepId: z.string().uuid(),
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
