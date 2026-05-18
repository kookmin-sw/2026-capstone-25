import type { DecomposeApiResponse, Step } from "../../schemas/decompose";
import StepCard from "./StepCard";

// §3.3 ① 결과 블록 — 프로젝트명 + "✦ AI가 N개 단계로 정리했어요" + 단계 리스트.
// 트리(1차 + 2차 자식) 인지: 1차 단계만 카드로 렌더하고 자식은 StepCard 내부에 누적 표시.
// isTemplateSourced: 입력에 templateHint 가 있었다면 §8.5 출처 뱃지를 추가로 표시.
type Props = {
  projectTitle: string;
  data: DecomposeApiResponse;
  busySubDecomposeParentId: string | null;
  isTemplateSourced?: boolean;
  onSubDecompose: (parent: Step) => void;
  onCancelSubSteps: (parent: Step) => void;
};

export default function ResultBlock({
  projectTitle,
  data,
  busySubDecomposeParentId,
  isTemplateSourced = false,
  onSubDecompose,
  onCancelSubSteps,
}: Props) {
  const allSteps = data.result.steps;
  const topLevel = allSteps.filter((s) => s.parent_step_id === null);

  const childrenByParent = new Map<string, Step[]>();
  for (const s of allSteps) {
    if (!s.parent_step_id) continue;
    const list = childrenByParent.get(s.parent_step_id) ?? [];
    list.push(s);
    childrenByParent.set(s.parent_step_id, list);
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-1.5 mb-[10px]">
        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-ac-d bg-ac-s rounded-full px-[10px] py-1">
          ✦ AI가 {topLevel.length}개 단계로 정리했어요
        </div>
        {isTemplateSourced && (
          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-tx2 bg-fa border border-bd2 rounded-full px-[10px] py-1">
            📋 템플릿 기반
          </div>
        )}
      </div>
      <div className="text-[21px] font-extrabold text-tx leading-[1.3] mb-[14px] break-keep">
        {projectTitle}
      </div>

      <div>
        {topLevel.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            subSteps={childrenByParent.get(step.id) ?? []}
            busySubDecompose={busySubDecomposeParentId === step.id}
            onSubDecompose={onSubDecompose}
            onCancelSubSteps={onCancelSubSteps}
          />
        ))}
      </div>
    </div>
  );
}
