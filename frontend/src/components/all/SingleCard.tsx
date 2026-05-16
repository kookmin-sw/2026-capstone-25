import { Trash2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ProjectSummary } from "../../services/projects";

type Props = {
  project: ProjectSummary;
  onDelete: (id: string) => void;
  onToggle: (stepId: string, done: boolean) => void;
};

export default function SingleCard({ project, onDelete, onToggle }: Props) {
  const navigate = useNavigate();
  const done = project.progress >= 100;
  const stepId = project.firstStepId;
  const color = project.color ?? "var(--color-ac)";

  return (
    <article
      className={[
        "bg-sf border border-bd2 rounded-2xl px-4 py-[10px] shadow-sm flex items-center gap-[10px] transition-opacity",
        done ? "opacity-60" : "",
      ].join(" ")}
    >
      {/* 프로젝트 색상 점 */}
      <div
        className="w-[10px] h-[10px] rounded-full shrink-0"
        style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${color}25` }}
      />

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

      {/* 미완료일 때만 시작 버튼 */}
      {!done && stepId && (
        <button
          type="button"
          onClick={() => navigate(`/timer/${stepId}`)}
          className="bg-ac-s text-ac-d border-none rounded-[10px] px-[14px] py-[8px] text-xs font-black cursor-pointer whitespace-nowrap shrink-0 hover:opacity-80 transition-opacity"
        >
          시작
        </button>
      )}

      {/* 완료 체크 버튼 */}
      <button
        type="button"
        onClick={() => stepId && onToggle(stepId, !done)}
        aria-label={done ? "완료 해제" : "완료 체크"}
        className={[
          "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all",
          done ? "bg-tx2 border-tx2" : "bg-sf border-bd hover:border-tx2",
        ].join(" ")}
      >
        {done && <Check size={14} strokeWidth={2.5} color="white" />}
      </button>

      {/* 삭제 버튼 */}
      <button
        type="button"
        onClick={() => onDelete(project.id)}
        aria-label={`${project.title} 삭제`}
        className="p-1.5 rounded-lg text-mu hover:bg-red-50 hover:text-red-500 cursor-pointer transition-colors shrink-0"
      >
        <Trash2 size={15} aria-hidden />
      </button>
    </article>
  );
}
