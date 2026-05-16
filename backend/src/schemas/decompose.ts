import { z } from "zod";

// decompose 단일 호출 출력 스키마
// AI가 반환한 JSON 텍스트를 이 스키마로 parse 한다.
// 프론트/백에서 import해서 단일 소스로 사용한다.

// 재분해 방향. 결과 화면 ③ 재분해 블록에서 "더 잘게/더 크게/AI에게 직접 얘기"를 누르면 같이 보낸다.
export const RefineModeSchema = z.enum(["smaller", "larger", "feedback"]);
export type RefineMode = z.infer<typeof RefineModeSchema>;

// 직전 분해 결과 압축 — refineMode === "feedback" 일 때만 의미 있음.
// title/description만 보낸다. AI가 새 경계를 자유롭게 다시 판단하도록 guide/first_move 등 메타 필드는 일부러 뺀다.
export const PreviousStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
});
export type PreviousStep = z.infer<typeof PreviousStepSchema>;

// 첨부파일 제한 — 프론트/백 단일 소스. UI 가드와 백엔드 superrefine 가드가 동일 값을 본다.
export const ATTACHMENT_MAX_COUNT = 3;
export const ATTACHMENT_MAX_BYTES_PER_FILE = 5 * 1024 * 1024;
export const ATTACHMENT_MAX_BYTES_TOTAL = 5 * 1024 * 1024;

// 첨부 형식 화이트리스트 — Anthropic 입력 분기와 일치.
// document: pdf (Anthropic 네이티브 PDF document block)
// text:     txt · md (utf-8 디코드 후 text block)
// docx:     mammoth 로 텍스트 추출 후 text block
// image:    png · jpg · webp · gif (Anthropic vision)
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

// Supabase Storage 에 업로드된 첨부 파일을 참조한다.
// 백엔드는 path 로 다운로드해 내용을 추출 후 user 메시지에 결합한다.
// 파일 본체는 브라우저 ↔ Supabase Storage 사이에서만 오가고, 백엔드 ↔ 프론트는 path 만 주고받는다.
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


// 2차 분해 요청 — 부모 단계 하나를 분해한다.
export const SubDecomposeRequestSchema = z.object({
  parent: z.object({
    step_id: z.string().min(1),
    step_title: z.string().min(1),
    step_description: z.string(),
    parent_goal: z.string().min(1),
  }),
  memo: z.string().max(5000).optional(),
});

export type SubDecomposeRequest = z.infer<typeof SubDecomposeRequestSchema>;


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

export const DecomposeResultSchema = z.object({
  analysis: AnalysisSchema,
  steps: z.array(StepSchema).min(1),
  reasoning: ReasoningSchema,
});

export type DecomposeResult = z.infer<typeof DecomposeResultSchema>;

// /api/decompose 응답 전체 모양. 양쪽에서 동일한 타입을 쓰기 위해 여기서 선언한다.
// refine(더 잘게/더 크게/AI에게 직접 얘기)과 confirm(확정/수정/단일/돌아가기)은
// 정적 데이터라 응답에 포함하지 않는다 — 프론트가 자체 상수로 들고 있다.
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
export type Step = z.infer<typeof StepSchema>;
