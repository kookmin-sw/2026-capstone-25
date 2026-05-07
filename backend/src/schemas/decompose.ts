import { z } from "zod";

// decompose 단일 호출 출력 스키마
// AI가 반환한 JSON 텍스트를 이 스키마로 parse 한다.
// 프론트/백에서 import해서 단일 소스로 사용한다.

export const DecomposeRequestSchema = z.object({
  title: z.string().min(1).max(500),
  memo: z.string().max(5000).optional(),
  startDate: z.string().date().optional(),
  dueDate: z.string().date().optional(),
  templateHint: z.string().max(2000).optional(),
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
