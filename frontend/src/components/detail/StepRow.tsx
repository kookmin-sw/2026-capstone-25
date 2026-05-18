// 단계 카드 — 번호 뱃지, 제목, description, 자식 박스, 액션 버튼을 한 화면에 펼쳐 보여준다.
// StepCard(결과 화면)와 동일한 정보 구조를 유지한다. 펼침 토글 없이 항상 풀 정보를 노출한다.
// onToggle: 완료 체크 클릭 시 부모(ProjectDetailPage)가 낙관적 UI 갱신 후 PATCH 호출.
// 시작 버튼: /timer/:stepId 로 이동해 타이머를 시작한다.
// children: 하위(2차 분해) 단계가 있으면 SubStepBox로 누적 표시하고 액션 버튼이 §10.3.3 ② 분기로 바뀐다.
import { useNavigate } from "react-router-dom";
import { Check, Split } from "lucide-react";
import type { StepDetail } from "../../services/projects";
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
};

export default function StepRow({
  step,
  index,
  isNext,
  color,
  subSteps,
  busySubDecompose = false,
  onToggle,
  onSubDecompose,
}: Props) {
  const navigate = useNavigate();
  const accentColor = color ?? "var(--color-ac)";

  const badgeBg = isNext ? "var(--color-ac)" : `${accentColor}22`;
  const badgeColor = isNext ? "#fff" : accentColor;

  const hasChildren = subSteps.length > 0;
  const showActionRow = !hasChildren && !step.done;

  return (
    <div className="bg-sf border border-bd2 rounded-2xl px-4 py-3.5 shadow-sm">
      {/* ── 헤더 행 — 번호 뱃지 + 제목/설명 + 체크 ── */}
      <div className="flex items-start gap-3">
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
            <p className="text-[11px] text-mu mt-0.5 leading-relaxed whitespace-pre-wrap">
              {step.description}
            </p>
          )}
        </div>
        {/* 완료 체크 버튼 */}
        <button
          type="button"
          onClick={() => { if (!hasChildren) onToggle(step.id, !step.done); }}
          disabled={hasChildren}
          className={[
            "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 mt-0.5",
            hasChildren ? "cursor-default opacity-70" : "cursor-pointer",
            step.done ? "bg-gn border-gn" : "bg-transparent border-bd hover:border-gn",
          ].join(" ")}
          aria-label={step.done ? "완료 해제" : "완료 체크"}
          title={hasChildren ? "하위 단계가 모두 완료되면 자동 완료돼요" : undefined}
        >
          {step.done && <Check size={11} strokeWidth={2.5} color="white" />}
        </button>
      </div>

      {/* 하위 단계 박스 — 2차 분해 결과가 있을 때만 (§10.3.5) */}
      {hasChildren && (
        <div className="mt-3 pt-3 border-t border-bd2">
          <SubStepBox
            parent={step}
            subSteps={subSteps}
            color={color}
            onToggle={onToggle}
          />
        </div>
      )}

      {/* 액션 버튼 — §10.3.3 ②: 하위 없으면 쪼개기+시작(미완료만). 완료+하위없음은 숨김 */}
      {showActionRow && (
        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-bd2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSubDecompose(step); }}
            disabled={busySubDecompose}
            className="inline-flex items-center gap-1 bg-fa text-tx2 border border-bd rounded-xl px-3 py-1.5 text-xs font-black hover:bg-ac-s hover:text-ac-d hover:border-ac transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Split size={12} strokeWidth={2.5} />
            {busySubDecompose ? "쪼개는 중…" : "하위 단계로 쪼개기"}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/timer/${step.id}`); }}
            className="bg-fa text-tx2 border border-bd rounded-xl px-3 py-1.5 text-xs font-black hover:bg-ac-s hover:text-ac-d hover:border-ac transition-colors cursor-pointer"
          >
            시작
          </button>
        </div>
      )}
    </div>
  );
}
