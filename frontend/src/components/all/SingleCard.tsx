import { Trash2 } from "lucide-react";
import type { ProjectSummary } from "../../services/projects";

// AI 분해 없이 저장된 단일 작업 카드.
// 상세 화면 없이 체크/시작/삭제 중심으로 보여준다.
type Props = {
  project: ProjectSummary;
  onDelete: (id: string) => void;
};

export default function SingleCard({ project, onDelete }: Props) {
  const done = project.progress >= 100;

  return (
    <article className="bg-sf border border-bd2 rounded-2xl px-4 py-4 shadow-sm flex items-center gap-3">
      <button
        type="button"
        aria-pressed={done}
        aria-label={done ? "완료됨" : "미완료"}
        className={[
          "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
          done ? "bg-ac border-ac text-white" : "border-mu text-transparent",
        ].join(" ")}
      >
        <span className="text-xs font-black">✓</span>
      </button>

      <div className="min-w-0 flex-1">
        <h2
          className={[
            "text-sm font-black leading-5 truncate",
            done ? "text-mu line-through" : "text-tx",
          ].join(" ")}
        >
          {project.title}
        </h2>
        <p className="mt-1 text-[11px] font-bold text-mu">단일 작업</p>
      </div>

      <button type="button" className="rounded-full bg-tx text-white px-3 py-2 text-xs font-black">
        시작
      </button>
      <button
        type="button"
        onClick={() => onDelete(project.id)}
        aria-label={`${project.title} 삭제`}
        className="p-1.5 rounded-lg text-mu hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={16} aria-hidden />
      </button>
    </article>
  );
}
