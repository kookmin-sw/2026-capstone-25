import { Split } from "lucide-react";
import type { Step } from "../../schemas/decompose";

// §7.1 단계 카드. 번호+제목+description+(자식 박스/쪼개기 버튼).
// 펼침 토글 없이 항상 풀 정보를 노출한다 — description만으로 단계의 맥락과 첫 손짓을 모두 전달한다.
// subSteps: 2차 분해 결과(부모인 이 카드의 자식들). 빈 배열이면 leaf.
// onSubDecompose: leaf일 때 노출되는 "하위 단계로 쪼개기" 버튼이 호출.
// onCancelSubSteps: 자식 박스의 "전체 취소" 버튼이 호출 — 메모리 트리에서 이 부모의 자식을 통째로 폐기.
type Props = {
  step: Step;
  index: number;
  subSteps?: Step[];
  busySubDecompose?: boolean;
  onSubDecompose?: (parent: Step) => void;
  onCancelSubSteps?: (parent: Step) => void;
};

export default function StepCard({
  step,
  index,
  subSteps = [],
  busySubDecompose = false,
  onSubDecompose,
  onCancelSubSteps,
}: Props) {
  const hasChildren = subSteps.length > 0;

  return (
    <div className="bg-sf border border-bd2 rounded-xl px-4 py-[14px] mb-[10px]">
      <div className="flex items-start gap-[10px]">
        <div className="w-6 h-6 rounded-full flex-shrink-0 bg-ac-s text-ac-d flex items-center justify-center text-[11px] font-extrabold mt-[1px]">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-tx">{step.title}</div>
          {step.description && (
            <div className="text-[11px] text-mu mt-[2px] leading-[1.6] whitespace-pre-wrap">
              {step.description}
            </div>
          )}
        </div>
      </div>

      {/* 자식 단계 박스 — 2차 분해 결과 누적 표시 (§10.3.5) */}
      {hasChildren && (
        <div className="mt-[10px] pt-[10px] border-t border-bd2">
          <div className="bg-fa border border-bd2 rounded-[10px] px-3 py-[10px]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold text-ac-d tracking-wide">
                📂 하위 단계 {subSteps.length}개
              </div>
              {onCancelSubSteps && (
                <button
                  type="button"
                  onClick={() => onCancelSubSteps(step)}
                  className="text-[11px] font-bold text-mu hover:text-rd transition-colors cursor-pointer"
                >
                  전체 취소
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {subSteps.map((sub, i) => (
                <div
                  key={sub.id}
                  className="flex items-start gap-2 bg-sf border border-bd rounded-lg px-2.5 py-2"
                >
                  <span className="w-5 h-5 shrink-0 rounded-full bg-ac-s text-ac-d flex items-center justify-center text-[10px] font-black mt-[1px]">
                    {i + 1}
                  </span>
                  <p className="flex-1 min-w-0 text-xs font-bold text-tx leading-snug break-keep">
                    {sub.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 액션 — 자식이 없는 leaf에만 "하위 단계로 쪼개기" 노출 */}
      {!hasChildren && onSubDecompose && (
        <div className="flex justify-end pt-[10px]">
          <button
            type="button"
            onClick={() => onSubDecompose(step)}
            disabled={busySubDecompose}
            className="inline-flex items-center gap-1 bg-fa text-tx2 border border-bd rounded-xl px-3 py-1.5 text-xs font-black hover:bg-ac-s hover:text-ac-d hover:border-ac transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Split size={12} strokeWidth={2.5} />
            {busySubDecompose ? "쪼개는 중…" : "하위 단계로 쪼개기"}
          </button>
        </div>
      )}
    </div>
  );
}
