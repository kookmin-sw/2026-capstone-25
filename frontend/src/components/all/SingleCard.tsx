import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ProjectSummary } from "../../services/projects";

type Props = {
  project: ProjectSummary;
  onToggle: (stepId: string, done: boolean) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
};

export default function SingleCard({ project, onToggle, selectionMode, isSelected, onToggleSelect }: Props) {
  const navigate = useNavigate();
  const done = project.progress >= 100;
  const stepId = project.firstStepId;
  const color = project.color ?? "var(--color-ac)";

  return (
    <article
      className={[
        "bg-sf border rounded-2xl px-4 py-[10px] shadow-sm flex items-center gap-[10px] transition-all",
        done && !selectionMode ? "opacity-60" : "",
        selectionMode ? "cursor-pointer" : "",
        isSelected ? "border-ac bg-ac-s" : "border-bd2",
      ].join(" ")}
      onClick={selectionMode ? () => onToggleSelect?.(project.id) : undefined}
    >
      {/* 선택 모드: 체크박스 / 일반: 색상 점 */}
      {selectionMode ? (
        <span className={["w-5 h-5 rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-all", isSelected ? "border-ac bg-ac" : "border-bd bg-sf"].join(" ")}>
          {isSelected && <Check size={11} strokeWidth={3} color="white" />}
        </span>
      ) : (
        <div
          className="w-[10px] h-[10px] rounded-full shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${color}25` }}
        />
      )}

      {/* 제목 */}
      <div className="min-w-0 flex-1">
        <p
          className={[
            "text-[15px] font-bold leading-5 truncate",
            done ? "line-through text-mu" : "text-tx",
          ].join(" ")}
        >
          {project.title}
        </p>
      </div>

      {/* 선택 모드 아닐 때만 시작·체크 버튼 표시 */}
      {!selectionMode && (
        <>
          {!done && stepId && (
            <button
              type="button"
              onClick={() => navigate(`/timer/${stepId}`)}
              className="bg-ac-s text-ac-d border-none rounded-[10px] px-[14px] py-[8px] text-xs font-black cursor-pointer whitespace-nowrap shrink-0 hover:opacity-80 transition-opacity"
            >
              시작
            </button>
          )}
          <button
            type="button"
            onClick={() => stepId && onToggle(stepId, !done)}
            aria-label={done ? "완료 해제" : "완료 체크"}
            className={[
              "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all",
              done ? "bg-tx2 border-tx2" : "bg-sf border-bd hover:border-tx2",
            ].join(" ")}
          >
            {done && <Check size={11} strokeWidth={2.5} color="white" />}
          </button>
        </>
      )}
    </article>
  );
}
