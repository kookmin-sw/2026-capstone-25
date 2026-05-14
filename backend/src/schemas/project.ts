import { z } from "zod";

// POST /api/projects 요청 body 검증용 스키마.
// ConfirmBlock이 붙으면 이 형태로 프로젝트와 단계들을 저장한다.
// children: 2차 분해 결과를 결과 화면에서 같이 저장할 때 사용. 깊이는 2차까지 (자식은 children을 갖지 않는다).
type CreateStepInputShape = {
  title: string;
  description?: string;
  guide?: string;
  firstMove?: string;
  unblocker?: string;
  estimatedMinutes?: number;
  boundarySignal?: string;
  children?: CreateStepInputShape[];
};

export const CreateStepSchema: z.ZodType<CreateStepInputShape> = z.lazy(() =>
  z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    guide: z.string().optional(),
    firstMove: z.string().optional(),
    unblocker: z.string().optional(),
    estimatedMinutes: z.number().int().positive().optional(),
    boundarySignal: z.string().optional(),
    children: z.array(CreateStepSchema).optional(),
  }),
);

export const CreateProjectSchema = z.object({
  title: z.string().min(1).max(200),
  memo: z.string().max(5000).optional(),
  primaryType: z.string().optional(),
  secondaryTags: z.array(z.string()).default([]),
  goal: z.string().min(1),
  currentPhase: z.string().optional(),
  color: z.string().optional(),
  startDate: z.string().date().optional(),
  due: z.string().date().optional(),
  isSingle: z.boolean().default(false),
  scale: z.string().optional(),
  templateId: z.string().optional(),
  templateName: z.string().optional(),
  steps: z.array(CreateStepSchema).default([]),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

// PATCH /api/projects/:id/steps 요청 body 검증용 스키마.
// id가 없으면 신규 단계, 있으면 기존 단계 메타데이터를 복사한다.
// children: 2차(자식) 단계. 깊이는 2차까지 (자식은 children을 갖지 않는다).
type EditStepShape = {
  id?: string;
  title: string;
  children?: EditStepShape[];
};

const EditStepNode: z.ZodType<EditStepShape> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    title: z.string().min(1),
    children: z.array(EditStepNode).optional(),
  }),
);

export const EditStepsSchema = z.object({
  steps: z.array(EditStepNode).min(1),
});

// POST /api/projects/:projectId/sub-steps 요청 body 검증용 스키마.
// 2차 분해 결과(AI 응답의 steps)를 부모 단계 밑에 저장한다.
export const CreateSubStepsSchema = z.object({
  parentStepId: z.string().min(1),
  steps: z.array(CreateStepSchema).min(1),
});
