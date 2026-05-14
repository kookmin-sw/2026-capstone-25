// 하위 단계 박스 — 부모 카드(펼친 상태) 내부에 누적 표시한다.
// 작은 번호 + 제목 + 상태 + "시작" + 완료 체크 (§10.3.5).
// 부모 자동 완료/해제 계산은 ProjectDetailPage가 책임진다.
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import type { StepDetail } from "../../services/projects";

type Props = {
  parent: StepDetail;
  subSteps: StepDetail[];
  color: string | null;
  onToggle: (id: string, done: boolean) => void;
  onCancelSubSteps?: (parent: StepDetail) => void;
};

export default function SubStepBox({ parent, subSteps, color, onToggle, onCancelSubSteps }: Props) {
  const navigate = useNavigate();
  const accentColor = color ?? "var(--color-ac)";
  const parentDone = parent.done;

  return (
    <div className="bg-fa border border-bd2 rounded-xl px-3 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-ac-d tracking-wide">📂 하위 단계 {subSteps.length}개</p>
        {onCancelSubSteps && (
          <button
            type="button"
            onClick={() => onCancelSubSteps(parent)}
            className="text-[11px] font-bold text-mu hover:text-rd transition-colors cursor-pointer"
          >
            전체 취소
          </button>
        )}
      </div>
      {subSteps.map((sub, idx) => (
        <div
          key={sub.id}
          className="flex items-center gap-2 bg-sf border border-bd rounded-lg px-2.5 py-2"
        >
          <span
            className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black"
            style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
          >
            {idx + 1}
          </span>
          <p
            className={[
              "flex-1 min-w-0 text-xs font-bold leading-snug break-keep",
              sub.done ? "line-through text-mu" : "text-tx",
            ].join(" ")}
          >
            {sub.title}
          </p>
          {!sub.done && !parentDone && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/timer/${sub.id}`); }}
              className="shrink-0 bg-fa text-tx2 border border-bd rounded-lg px-2 py-1 text-[11px] font-black hover:bg-ac-s hover:text-ac-d hover:border-ac transition-colors cursor-pointer"
            >
              시작
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(sub.id, !sub.done); }}
            className={[
              "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 cursor-pointer",
              sub.done ? "bg-gn border-gn" : "bg-transparent border-bd2 hover:border-gn",
            ].join(" ")}
            aria-label={sub.done ? "하위 단계 완료 해제" : "하위 단계 완료 체크"}
          >
            {sub.done && <Check size={10} strokeWidth={3} color="white" />}
          </button>
        </div>
      ))}
    </div>
  );
}
