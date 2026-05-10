import { useState } from "react";
import type { Step } from "../../schemas/decompose";

// §7.1 단계 카드. 접힘: 번호+제목+예상시간 뱃지. 펼침: §7.2 가이드 3문장.
// TODO: 2차 분해 진입점
type Props = {
  step: Step;
  index: number;
  defaultOpen?: boolean;
};

// §7.1 예상 시간 뱃지 — 분 값을 적응적 단위로. 1일=720분, 1주=5400분.
function formatEstimate(min: number): string {
  if (min <= 0) return "";
  if (min < 60) return `예상 ${min}분`;
  if (min < 720) return `예상 ~${Math.round(min / 60)}시간`;
  if (min < 5400) return `예상 ~${Math.round(min / 600)}일`;
  return `예상 ~${Math.round(min / 2400)}주`;
}

export default function StepCard({ step, index, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const estimate = formatEstimate(step.estimated_minutes);

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
