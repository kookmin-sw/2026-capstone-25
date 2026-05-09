import { useState } from "react";
import type { DecomposeApiResponse } from "../../schemas/decompose";

// §3.3 ② AI 추론 블록 — 접힘식 "💭 왜 이렇게 나눴어요?".
// 펼치면 "무엇을 읽었는지(reasoning.what_was_read)" + "어떤 기준으로 나눴는지(reasoning.how_we_split)".
type Props = {
  reasoning: DecomposeApiResponse["reasoning"];
};

export default function ReasoningBlock({ reasoning }: Props) {
  const [open, setOpen] = useState(false);
  const hasContent = !!(reasoning.what_was_read?.trim() || reasoning.how_we_split?.trim());
  if (!hasContent) return null;

  return (
    <div
      className={[
        "bg-sf border border-bd2 rounded-xl mb-4 overflow-hidden",
        open ? "shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 bg-transparent border-none px-[18px] py-[14px] cursor-pointer text-left"
      >
        <div className="text-sm font-bold text-tx">💭 왜 이렇게 나눴어요?</div>
        <div className="flex items-center gap-1 text-[11px] text-mu font-semibold">
          {open ? "접기" : "펼치기"}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={open ? "rotate-180 transition-transform" : "transition-transform"}
          >
            <path
              d="M2 4l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>
      {open && (
        <div className="px-[18px] pb-[14px] flex flex-col gap-[10px]">
          {reasoning.what_was_read?.trim() && (
            <ReasonItem index={1} label="무엇을 읽었는지" text={reasoning.what_was_read} />
          )}
          {reasoning.how_we_split?.trim() && (
            <ReasonItem index={2} label="어떤 기준으로 나눴는지" text={reasoning.how_we_split} />
          )}
        </div>
      )}
    </div>
  );
}

function ReasonItem({ index, label, text }: { index: number; label: string; text: string }) {
  return (
    <div className="flex items-start gap-[10px] bg-fa border border-bd2 rounded-[10px] px-3 py-[10px]">
      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-ac-s text-ac-d flex items-center justify-center text-[10px] font-extrabold mt-[1px]">
        {index}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-ac-d tracking-wide mb-1">{label}</div>
        <div className="text-[12.5px] text-tx2 leading-[1.6]">{text}</div>
      </div>
    </div>
  );
}
