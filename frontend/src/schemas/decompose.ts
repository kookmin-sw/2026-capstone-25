// /api/decompose 요청·응답 스키마.
// backend/src/schemas/decompose.ts 와 모양이 같아야 한다. 한쪽을 바꿀 때 반드시 같이 갱신할 것.
import { z } from "zod";

export const RefineModeSchema = z.enum(["smaller", "larger", "feedback"]);
export type RefineMode = z.infer<typeof RefineModeSchema>;

export const DecomposeRequestSchema = z.object({
  title: z.string().min(1).max(500),
  memo: z.string().max(5000).optional(),
  startDate: z.string().date().optional(),
  dueDate: z.string().date().optional(),
  templateHint: z.string().max(2000).optional(),
  refineMode: RefineModeSchema.optional(),
  refineFeedback: z.string().max(2000).optional(),
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
