// 단계 카드 — 번호 뱃지, 접힘/펼침, 다음 단계 강조, 가이드 텍스트를 표시한다.
// onToggle: 완료 체크 클릭 시 부모(ProjectDetailPage)가 낙관적 UI 갱신 후 PATCH 호출.
// 시작 버튼: /timer/:stepId 로 이동해 타이머를 시작한다.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { StepDetail } from "../../services/projects";

type Props = {
  step: StepDetail;
  index: number;
  isNext: boolean;
  color: string | null;
  onToggle: (id: string, done: boolean) => void;
};

export default function StepRow({ step, index, isNext, color, onToggle }: Props) {
  // 다음 단계는 기본으로 펼쳐진 상태로 시작
  const [expanded, setExpanded] = useState(isNext);
  const navigate = useNavigate();
  const accentColor = color ?? "var(--color-ac)";

  const badgeBg = isNext ? "var(--color-ac)" : `${accentColor}22`;
  const badgeColor = isNext ? "#fff" : accentColor;

  const statusLabel = step.done ? "완료" : step.estimatedMinutes ? `약 ${step.estimatedMinutes}분` : "";

  return (
    <div className="bg-sf border border-bd2 rounded-2xl px-4 py-3.5 shadow-sm">
      {/* ── 헤더 행 — 번호 뱃지 + 제목 + 토글 버튼 ── */}
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div
          className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black"
          style={{ backgroundColor: badgeBg, color: badgeColor }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={[
              "text-sm font-bold leading-5 break-keep",
              step.done ? "line-through text-mu" : "text-tx",
            ].join(" ")}
          >
            {step.title}
          </p>
          {statusLabel && (
            <p className="text-[11px] text-mu mt-0.5">{statusLabel}</p>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded((prev) => !prev); }}
          className="w-7 h-7 border border-bd rounded-lg bg-sf text-tx2 flex items-center justify-center shrink-0"
          aria-label={expanded ? "접기" : "펼치기"}
        >
          <ChevronDown
            size={12}
            className="transition-transform duration-200"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      </div>

      {/* ── 펼쳐진 영역 — 가이드 + 액션 ── */}
      {expanded && (
        <div className="border-t border-bd2 mt-3 pt-3 space-y-3">
          {step.guide && (
            <p className="text-xs text-tx2 leading-relaxed bg-fa border border-bd2 rounded-xl px-3 py-2.5">
              {step.guide}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            {/* 시작 버튼 — 클릭 시 타이머 페이지로 이동 */}
            {!step.done && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate(`/timer/${step.id}`); }}
                className="bg-fa text-tx2 border border-bd rounded-xl px-3 py-1.5 text-xs font-black hover:bg-ac-s hover:text-ac-d hover:border-ac transition-colors"
              >
                시작
              </button>
            )}
            {/* 완료 체크 버튼 — 클릭 시 onToggle로 부모에 알린다 */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggle(step.id, !step.done); }}
              className={[
                "w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-150",
                step.done
                  ? "bg-green-500 border-transparent"
                  : "bg-transparent border-bd hover:border-green-400",
              ].join(" ")}
              aria-label={step.done ? "완료 해제" : "완료 체크"}
            >
              {step.done && (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 5.5l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
