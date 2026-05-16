// /api/decompose 요청·응답 스키마.
// backend/src/schemas/decompose.ts 와 모양이 같아야 한다. 한쪽을 바꿀 때 반드시 같이 갱신할 것.
import { z } from "zod";

export const RefineModeSchema = z.enum(["smaller", "larger", "feedback"]);
export type RefineMode = z.infer<typeof RefineModeSchema>;

// 직전 분해 결과 압축 — refineMode === "feedback" 일 때만 의미 있음.
// backend/src/schemas/decompose.ts 와 동일 모양을 유지한다.
export const PreviousStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
});
export type PreviousStep = z.infer<typeof PreviousStepSchema>;

// 첨부파일 제한 — backend/src/schemas/decompose.ts 와 동일 값. 한쪽 변경 시 양쪽 갱신.
export const ATTACHMENT_MAX_COUNT = 3;
export const ATTACHMENT_MAX_BYTES_PER_FILE = 5 * 1024 * 1024;
export const ATTACHMENT_MAX_BYTES_TOTAL = 5 * 1024 * 1024;

export const ATTACHMENT_ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;
export type AttachmentMime = (typeof ATTACHMENT_ALLOWED_MIME)[number];

// 확장자 → MIME 매핑. 브라우저가 File.type 을 빈 문자열로 주는 경우(특히 .md/.txt) 의 폴백.
export const ATTACHMENT_EXT_TO_MIME: Record<string, AttachmentMime> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export const AttachmentRefSchema = z.object({
  path: z.string().min(1).max(500),
  filename: z.string().min(1).max(255),
  contentType: z.enum(ATTACHMENT_ALLOWED_MIME),
  size: z.number().int().nonnegative().max(ATTACHMENT_MAX_BYTES_PER_FILE),
});
export type AttachmentRef = z.infer<typeof AttachmentRefSchema>;

export const DecomposeRequestSchema = z
  .object({
    title: z.string().min(1).max(500),
    memo: z.string().max(5000).optional(),
    startDate: z.string().date().optional(),
    dueDate: z.string().date().optional(),
    templateHint: z.string().max(2000).optional(),
    refineMode: RefineModeSchema.optional(),
    refineFeedback: z.string().max(2000).optional(),
    previousSteps: z.array(PreviousStepSchema).max(30).optional(),
    attachments: z.array(AttachmentRefSchema).max(ATTACHMENT_MAX_COUNT).optional(),
  })
  .superRefine((value, ctx) => {
    const atts = value.attachments;
    if (!atts || atts.length === 0) return;
    const totalBytes = atts.reduce((sum, a) => sum + a.size, 0);
    if (totalBytes > ATTACHMENT_MAX_BYTES_TOTAL) {
      ctx.addIssue({
        code: "custom",
        path: ["attachments"],
        message: `첨부 파일 총 용량이 ${Math.round(ATTACHMENT_MAX_BYTES_TOTAL / (1024 * 1024))}MB 를 초과합니다.`,
      });
    }
  });

export type DecomposeRequest = z.infer<typeof DecomposeRequestSchema>;

export const BoundarySignalSchema = z.enum([
  "phase",
  "artifact",
  "decision",
  "mode",
  "dependency",
  "context",
]);

export const StepSchema = z.object({
  id: z.string().min(1),
  parent_step_id: z.string().nullable(),
  title: z.string().min(1),
  description: z.string(),
  guide: z.string(),
  first_move: z.string(),
  unblocker: z.string(),
  estimated_minutes: z.number().int().nonnegative(),
  boundary_signal: BoundarySignalSchema,
  done: z.boolean(),
  time_spent: z.number().nonnegative(),
});

export type Step = z.infer<typeof StepSchema>;

export const AnalysisSchema = z.object({
  primary_type: z.string(),
  secondary_tags: z.array(z.string()),
  goal: z.string(),
  current_position: z.object({
    phase_label: z.string(),
    phase_index: z.number().int().nonnegative(),
  }),
  constraints: z.array(z.string()),
  needs_clarification: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const ReasoningSchema = z.object({
  what_was_read: z.string(),
  how_we_split: z.string(),
});

export const ValidationIssueSchema = z.object({
  code: z.string(),
  severity: z.enum(["blocker", "warning"]),
  message: z.string(),
  step_ids: z.array(z.string()).optional(),
});

export const DecomposeApiResponseSchema = z.object({
  result: z.object({
    analysis: AnalysisSchema,
    steps: z.array(StepSchema).min(1),
  }),
  reasoning: ReasoningSchema,
  validation: z.object({
    ok: z.boolean(),
    issues: z.array(ValidationIssueSchema),
  }),
});

export type DecomposeApiResponse = z.infer<typeof DecomposeApiResponseSchema>;

// confirm 액션 식별자 — 응답엔 없지만 result 페이지 내부 핸들러 시그니처에 쓰인다.
export type ConfirmActionId = "save" | "edit" | "save-single" | "back";
