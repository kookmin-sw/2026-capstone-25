// 단계 카드 — 번호 뱃지, 접힘/펼침, 다음 단계 강조, 가이드 3박스를 표시한다.
// StepCard(결과 화면)와 동일한 정보 구조를 유지한다.
// onToggle: 완료 체크 클릭 시 부모(ProjectDetailPage)가 낙관적 UI 갱신 후 PATCH 호출.
// 시작 버튼: /timer/:stepId 로 이동해 타이머를 시작한다.
// children: 하위(2차 분해) 단계가 있으면 SubStepBox로 누적 표시하고 액션 버튼이 §10.3.3 ② 분기로 바뀐다.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Check, Split, Pencil } from "lucide-react";
import type { StepDetail } from "../../services/projects";
import AssignDateButton from "./AssignDateButton";
import SubStepBox from "./SubStepBox";

type Props = {
  step: StepDetail;
  index: number;
  isNext: boolean;
  color: string | null;
  subSteps: StepDetail[];          // 이 step의 하위 단계 (비었으면 빈 배열)
  busySubDecompose?: boolean;       // 2차 분해 호출 중 — 버튼 비활성
  onToggle: (id: string, done: boolean) => void;
  onSubDecompose: (parent: StepDetail) => void;
  onEditSubSteps: (parent: StepDetail) => void;
  onCancelSubSteps?: (parent: StepDetail) => void;
};

// 예상 시간을 사람이 읽기 쉬운 단위로 변환한다. 1일=720분, 1주=5400분 기준.
function formatEstimate(min: number | null): string {
  if (!min || min <= 0) return "";
  if (min < 60) return `예상 ${min}분`;
  if (min < 720) return `예상 ~${Math.round(min / 60)}시간`;
  if (min < 5400) return `예상 ~${Math.round(min / 720)}일`;
  return `예상 ~${Math.round(min / 5400)}주`;
}

export default function StepRow({
  step,
  index,
  isNext,
  color,
  subSteps,
  busySubDecompose = false,
  onToggle,
  onSubDecompose,
  onEditSubSteps,
  onCancelSubSteps,
}: Props) {
  // 다음 단계는 기본으로 펼쳐진 상태로 시작
  const [expanded, setExpanded] = useState(isNext);
  const navigate = useNavigate();
  const accentColor = color ?? "var(--color-ac)";

  const badgeBg = isNext ? "var(--color-ac)" : `${accentColor}22`;
  const badgeColor = isNext ? "#fff" : accentColor;

  const estimate = formatEstimate(step.estimatedMinutes);
  const hasChildren = subSteps.length > 0;

  return (
    <div className="bg-sf border border-bd2 rounded-2xl px-4 py-3.5 shadow-sm">
      {/* ── 헤더 행 — 번호 뱃지 + 제목 + 예상시간 + 펼침 버튼 ── */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-start gap-3 text-left cursor-pointer"
      >
        <div
          className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black mt-0.5"
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
          {step.description && (
            <p className={["text-[11px] text-mu mt-0.5 leading-relaxed", expanded ? "" : "line-clamp-1"].join(" ")}>
              {step.description}
            </p>
          )}
        </div>
        {/* 예상 시간 뱃지 */}
        {estimate && (
          <span className="shrink-0 text-[11px] text-tx2 font-semibold bg-fa border border-bd2 rounded-full px-2.5 py-0.5 mt-0.5">
            {estimate}
          </span>
        )}
        <span
          aria-hidden
          className={[
            "shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg border border-bd bg-sf text-tx2 transition-transform mt-0.5",
            expanded ? "rotate-180" : "",
          ].join(" ")}
        >
          <ChevronDown size={12} />
        </span>
      </button>

      {/* ── 펼쳐진 영역 — 가이드 3박스 + (하위 단계 박스) + 액션 버튼 ── */}
      {expanded && (
        <div className="border-t border-bd2 mt-3 pt-3 space-y-2">
          {/* 가이드 3박스 — StepCard와 동일한 구조 */}
          <GuideBox label="🎯 결과물" value={step.guide} fallback="결과물 안내가 없어요." />
          <GuideBox label="👣 첫 동작" value={step.firstMove} fallback="첫 동작 안내가 없어요." />
          <GuideBox label="🆘 막혔다면" value={step.unblocker} fallback="막혔을 때 안내가 없어요." />

          {/* 하위 단계 박스 — 2차 분해 결과가 있을 때만 (§10.3.5) */}
          {hasChildren && (
            <SubStepBox
              parent={step}
              subSteps={subSteps}
              color={color}
              onToggle={onToggle}
              onCancelSubSteps={onCancelSubSteps}
            />
          )}

          {/* 액션 버튼 — §10.3.3 ②: 하위 없으면 하위 단계로 쪼개기 + 시작 + 체크, 있으면 세부 단계 수정 + 체크 */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <AssignDateButton stepId={step.id} />
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEditSubSteps(step); }}
                className="inline-flex items-center gap-1 bg-fa text-tx2 border border-bd rounded-xl px-3 py-1.5 text-xs font-black hover:bg-ac-s hover:text-ac-d hover:border-ac transition-colors cursor-pointer"
              >
                <Pencil size={12} strokeWidth={2.5} />
                수정
              </button>
            ) : (
              <>
                {!step.done && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSubDecompose(step); }}
                    disabled={busySubDecompose}
                    className="inline-flex items-center gap-1 bg-fa text-tx2 border border-bd rounded-xl px-3 py-1.5 text-xs font-black hover:bg-ac-s hover:text-ac-d hover:border-ac transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Split size={12} strokeWidth={2.5} />
                    {busySubDecompose ? "쪼개는 중…" : "하위 단계로 쪼개기"}
                  </button>
                )}
                {!step.done && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate(`/timer/${step.id}`); }}
                    className="bg-fa text-tx2 border border-bd rounded-xl px-3 py-1.5 text-xs font-black hover:bg-ac-s hover:text-ac-d hover:border-ac transition-colors cursor-pointer"
                  >
                    시작
                  </button>
                )}
              </>
            )}
            {/* 완료 체크 버튼 — 크기를 키워 눈에 잘 띄게.
                하위가 있는 단계는 자식 완료 비율로 자동 결정되므로 직접 토글 비활성. */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (!hasChildren) onToggle(step.id, !step.done); }}
              disabled={hasChildren}
              className={[
                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-150",
                hasChildren ? "cursor-default" : "cursor-pointer",
                step.done
                  ? "bg-gn border-gn"
                  : "bg-transparent border-bd2 hover:border-gn",
                hasChildren ? "opacity-70" : "",
              ].join(" ")}
              aria-label={step.done ? "완료 해제" : "완료 체크"}
              title={hasChildren ? "하위 단계가 모두 완료되면 자동 완료돼요" : undefined}
            >
              {step.done && <Check size={14} strokeWidth={2.5} color="white" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 가이드 정보 박스 — label + value 형태. 비어있으면 흐린 fallback 텍스트 표시.
function GuideBox({ label, value, fallback }: { label: string; value: string | null; fallback: string }) {
  const empty = !value?.trim();
  return (
    <div className="bg-fa border border-bd2 rounded-xl px-3 py-2.5">
      <p className="text-[11px] font-bold text-ac-d tracking-wide mb-1">{label}</p>
      <p className={["text-xs leading-relaxed", empty ? "text-mu2" : "text-tx2"].join(" ")}>
        {empty ? fallback : value}
      </p>
    </div>
  );
}
