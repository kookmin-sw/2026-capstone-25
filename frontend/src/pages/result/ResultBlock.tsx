import type { DecomposeApiResponse } from "../../schemas/decompose";
import StepCard from "./StepCard";

// §3.3 ① 결과 블록 — 프로젝트명 + "✦ AI가 N개 단계로 정리했어요" + 단계 리스트.
type Props = {
  projectTitle: string;
  data: DecomposeApiResponse;
};

export default function ResultBlock({ projectTitle, data }: Props) {
  const { steps } = data.result;
  return (
    <div className="mb-4">
      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-ac-d bg-ac-s rounded-full px-[10px] py-1 mb-[10px]">
        ✦ AI가 {steps.length}개 단계로 정리했어요
      </div>
      <div className="text-[21px] font-extrabold text-tx leading-[1.3] mb-[14px]">
        {projectTitle}
      </div>

      <div>
        {steps.map((step, i) => (
          <StepCard key={step.id} step={step} index={i} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}
