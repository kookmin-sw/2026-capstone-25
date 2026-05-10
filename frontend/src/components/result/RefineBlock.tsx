import type { RefineMode } from "../../schemas/decompose";

// §3.3 ③ 재분해 블록 — "더 잘게/더 크게/AI에게 직접 얘기" + 이전 버전 돌리기.
// feedback("AI에게 직접 얘기")은 입력란 UX와 함께 추후 활성화
type RefineOption = { id: RefineMode; label: string; hint: string };

const REFINE_OPTIONS: RefineOption[] = [
  { id: "smaller", label: "더 잘게", hint: "" },
  { id: "larger", label: "더 크게", hint: "" },
];

type Props = {
  onRefine: (mode: RefineMode) => void;
  busy: boolean;
  historyCount: number; // 최대 3
  onRevert: () => void;
};

export default function RefineBlock({ onRefine, busy, historyCount, onRevert }: Props) {
  return (
    <div className="mb-4">
      <div className="text-[12px] font-bold text-tx2 mb-[10px]">💫 이렇게 다시 나눠볼까요?</div>
      <div className="flex flex-wrap gap-2">
        {REFINE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onRefine(opt.id)}
            disabled={busy}
            title={opt.hint}
            className={[
              "inline-flex items-center gap-1 px-[14px] py-[9px] rounded-full",
              "bg-sf border border-bd2 text-tx2 text-[12.5px] font-bold cursor-pointer",
              "hover:bg-ac-s hover:text-ac-d hover:border-ac-s",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {opt.label}
            <span className="text-[10px] text-mu font-medium">{opt.hint}</span>
          </button>
        ))}
      </div>

      {historyCount > 0 && (
        <div className="mt-3 flex items-center gap-2 bg-ac-s2 border border-bd2 rounded-[10px] px-3 py-[10px]">
          <span>💡</span>
          <span className="flex-1 text-[12.5px] text-tx2">
            이전 버전이 더 나았나요? 최근 {historyCount}개 결과 중 직전 결과로 돌릴 수 있어요.
          </span>
          <button
            type="button"
            onClick={onRevert}
            disabled={busy}
            className="bg-transparent border-none text-ac-d text-[12.5px] font-extrabold cursor-pointer disabled:opacity-50"
          >
            돌리기
          </button>
        </div>
      )}
    </div>
  );
}
