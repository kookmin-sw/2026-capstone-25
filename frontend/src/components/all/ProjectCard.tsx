import { ChevronRight, Trash2 } from "lucide-react";
import type { ProjectSummary } from "../../services/projects";

// AI로 분해된 일반 프로젝트 카드.
// 진행률, 다음 할 일, 삭제 액션을 목록에서 보여준다.
type Props = {
  project: ProjectSummary;
  onDelete: (id: string) => void;
};

export default function ProjectCard({ project, onDelete }: Props) {
  const isDone = project.progress >= 100;

  return (
    <article className="bg-sf border border-bd2 rounded-2xl px-4 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: project.color ?? "var(--color-ac)" }}
        />
        <button type="button" className="min-w-0 flex-1 text-left">
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
        </button>
        <button
          type="button"
          onClick={() => onDelete(project.id)}
          aria-label={`${project.title} 삭제`}
          className="p-1.5 rounded-lg text-mu hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={16} aria-hidden />
        </button>
        <ChevronRight size={18} className="mt-1 text-mu" aria-hidden />
      </div>

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

      <div className="mt-4 rounded-xl bg-fa px-3 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-mu">다음 할 일</p>
          <p className="mt-1 text-sm font-bold text-tx truncate">
            {project.nextStep?.title ?? "모든 단계를 완료했어요"}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full bg-tx text-white px-3 py-2 text-xs font-black"
        >
          시작
        </button>
      </div>
    </article>
  );
}
