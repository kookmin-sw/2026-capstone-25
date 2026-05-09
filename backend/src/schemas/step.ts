import { z } from "zod";

// PATCH /api/steps/:id 요청 body 검증용 스키마.
// done 필드만 받아서 완료 여부를 토글한다.
export const PatchStepSchema = z.object({
  done: z.boolean(),
});
