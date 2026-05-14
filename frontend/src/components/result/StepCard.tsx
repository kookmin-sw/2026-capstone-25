import { useState } from "react";
import { Split } from "lucide-react";
import type { Step } from "../../schemas/decompose";

// §7.1 단계 카드. 접힘: 번호+제목+예상시간 뱃지. 펼침: §7.2 가이드 3문장.
// subSteps: 2차 분해 결과(부모인 이 카드의 자식들). 빈 배열이면 leaf.
// onSubDecompose: leaf일 때 노출되는 "2단계 쪼개기" 버튼이 호출.
// onCancelSubSteps: 자식 박스의 "전체 취소" 버튼이 호출 — 메모리 트리에서 이 부모의 자식을 통째로 폐기.
type Props = {
  step: Step;
  index: number;
  defaultOpen?: boolean;
  subSteps?: Step[];
  busySubDecompose?: boolean;
  onSubDecompose?: (parent: Step) => void;
  onCancelSubSteps?: (parent: Step) => void;
};

// §7.1 예상 시간 뱃지 — 분 값을 적응적 단위로. 1일=720분, 1주=5400분.
function formatEstimate(min: number): string {
  if (min <= 0) return "";
  if (min < 60) return `예상 ${min}분`;
  if (min < 720) return `예상 ~${Math.round(min / 60)}시간`;
  if (min < 5400) return `예상 ~${Math.round(min / 600)}일`;
  return `예상 ~${Math.round(min / 2400)}주`;
}

export default function StepCard({
  step,
  index,
  defaultOpen = false,
  subSteps = [],
  busySubDecompose = false,
  onSubDecompose,
  onCancelSubSteps,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const estimate = formatEstimate(step.estimated_minutes);
  const hasChildren = subSteps.length > 0;

  return (
    <div className="bg-sf border border-bd2 rounded-xl px-4 py-[14px] mb-[10px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-start gap-[10px] bg-transparent border-none p-0 cursor-pointer text-left"
      >
        <div className="w-6 h-6 rounded-full flex-shrink-0 bg-ac-s text-ac-d flex items-center justify-center text-[11px] font-extrabold mt-[1px]">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className={["text-sm font-bold text-tx", open ? "" : "truncate"].join(" ")}>{step.title}</div>
          {step.description && (
            <div
              className={[
                "text-[11px] text-mu mt-[2px] leading-[1.6]",
                open ? "whitespace-pre-wrap" : "line-clamp-1",
              ].join(" ")}
            >
              {step.description}
            </div>
          )}
        </div>
        {estimate && (
          <span className="flex-shrink-0 text-[11px] text-tx2 font-semibold bg-fa border border-bd2 rounded-full px-[10px] py-[3px] mt-[1px]">
            {estimate}
          </span>
        )}
        <span
          aria-hidden
          className={[
            "flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg border border-bd bg-sf text-tx2 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 4.5l3.5 3.5 3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div className="mt-[10px] pt-[10px] border-t border-bd2 flex flex-col gap-2">
          <GuideRow label="🎯 결과물" value={step.guide} fallback="결과물이 비어 있어요." />
          <GuideRow label="👣 첫 동작" value={step.first_move} fallback="첫 동작이 비어 있어요." />
          <GuideRow label="🆘 막혔다면" value={step.unblocker} fallback="막혔을 때 안내가 비어 있어요." />

          {/* 자식 단계 박스 — 2차 분해 결과 누적 표시 (§10.3.5) */}
          {hasChildren && (
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
          )}

          {/* 액션 — 자식이 없는 leaf에만 "2단계 쪼개기" 노출 */}
          {!hasChildren && onSubDecompose && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => onSubDecompose(step)}
                disabled={busySubDecompose}
                className="inline-flex items-center gap-1 bg-fa text-tx2 border border-bd rounded-xl px-3 py-1.5 text-xs font-black hover:bg-ac-s hover:text-ac-d hover:border-ac transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Split size={12} strokeWidth={2.5} />
                {busySubDecompose ? "쪼개는 중…" : "2단계 쪼개기"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GuideRow({
  label,
  value,
  fallback,
}: {
  label: string;
  value: string;
  fallback: string;
}) {
  const empty = !value?.trim();
  return (
    <div className="bg-fa border border-bd2 rounded-[10px] px-3 py-[10px]">
      <div className="text-[11px] font-bold text-ac-d tracking-wide mb-1">{label}</div>
      <div
        className={[
          "text-[12.5px] leading-[1.6]",
          empty ? "text-mu2" : "text-tx2",
        ].join(" ")}
      >
        {empty ? fallback : value}
      </div>
    </div>
  );
}
