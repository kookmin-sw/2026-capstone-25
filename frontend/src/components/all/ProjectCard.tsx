import { ChevronRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ProjectSummary } from "../../services/projects";

type Props = {
  project: ProjectSummary;
  onDelete: (id: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
};

export default function ProjectCard({ project, onDelete: _, selectionMode, isSelected, onToggleSelect }: Props) {
  const navigate = useNavigate();
  const isDone = project.progress >= 100;

  return (
    <article
      className={[
        "bg-sf border rounded-2xl px-4 py-4 shadow-sm cursor-pointer transition-all",
        selectionMode ? "" : "hover:border-bd",
        isSelected ? "border-ac bg-ac-s" : "border-bd2",
      ].join(" ")}
      onClick={selectionMode ? () => onToggleSelect?.(project.id) : () => navigate(`/all/${project.id}`)}
    >
      <div className="flex items-start gap-3">
        {selectionMode ? (
          <span className={["mt-1 w-5 h-5 rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-all", isSelected ? "border-ac bg-ac" : "border-bd bg-sf"].join(" ")}>
            {isSelected && <Check size={11} strokeWidth={3} color="white" />}
          </span>
        ) : (
          <span
            aria-hidden
            className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: project.color ?? "var(--color-ac)",
              boxShadow: `0 0 0 3px ${project.color ?? "var(--color-ac)"}25`,
            }}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2
              className={[
                "text-sm font-black leading-5 break-keep",
                isDone ? "text-mu line-through" : "text-tx",
              ].join(" ")}
            >
              {project.title}
            </h2>
            {isDone && (
              <span className="rounded-full bg-fa px-2 py-0.5 text-[10px] font-bold text-mu">
                완료
              </span>
            )}
          </div>
        </div>
        {!selectionMode && <ChevronRight size={18} className="mt-0.5 text-mu shrink-0" aria-hidden />}
      </div>

      {/* 진행률 바 */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-fa overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${project.progress}%`,
              backgroundColor: project.color ?? "var(--color-ac)",
            }}
          />
        </div>
        <span className="w-10 text-right text-xs font-black text-tx2">{project.progress}%</span>
      </div>

      {/* 다음 할 일 — 클릭 시 타이머로 이동. 완료된 프로젝트는 비활성 */}
      <div
        className={[
          "mt-4 rounded-xl bg-fa px-3 py-3 flex items-center justify-between gap-3",
          !isDone && project.nextStep ? "hover:bg-ac-s transition-colors" : "",
        ].join(" ")}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDone && project.nextStep) navigate(`/timer/${project.nextStep.id}`);
        }}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-mu">다음 할 일</p>
          <p className="mt-1 text-sm font-bold text-tx truncate">
            {project.nextStep?.title ?? "모든 단계를 완료했어요"}
          </p>
        </div>
        {!isDone && project.nextStep && (
          <span className="shrink-0 rounded-full bg-ac-s text-ac-d border border-ac-s2 px-3 py-2 text-xs font-black">
            시작
          </span>
        )}
      </div>
    </article>
  );
}
