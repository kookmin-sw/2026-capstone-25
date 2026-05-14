// 선택 날짜의 배정된 단계 카드 리스트.
// 프로젝트 색상 점 + 단계 제목 + 프로젝트명 + ▲/▼ 우선순위 버튼 + 삭제 버튼.
// onDelete: 삭제 후 부모(CalendarPage)가 낙관적 UI 갱신.
// onPriorityChange: ▲/▼ 클릭 시 인접 항목과 priority를 교환한다.
import { X } from "lucide-react";
import { deleteAssignment, patchAssignment, type CalendarAssignment } from "../../services/calendar";

type Props = {
  assignments: CalendarAssignment[];
  onDelete: (id: string) => void;
  onPriorityChange: (id: string, priority: number) => void;
};

export default function DayList({ assignments, onDelete, onPriorityChange }: Props) {
  // priority ASC 정렬
  const sorted = [...assignments].sort((a, b) => a.priority - b.priority);

  // ▲/▼ — 인접 항목과 priority 교환 후 PATCH
  async function swap(indexA: number, indexB: number) {
    const a = sorted[indexA];
    const b = sorted[indexB];
    if (!a || !b) return;
    onPriorityChange(a.id, b.priority);
    onPriorityChange(b.id, a.priority);
    await Promise.all([
      patchAssignment(a.id, { priority: b.priority }),
      patchAssignment(b.id, { priority: a.priority }),
    ]).catch(() => {
      // 실패 시 원복은 부모 리패치로 해결 (간소화)
    });
  }

  async function handleDelete(id: string) {
    onDelete(id);
    await deleteAssignment(id).catch(() => {});
  }

  return (
    <div className="flex-1">
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <span className="text-3xl">📭</span>
          <p className="text-sm text-mu">배정된 단계가 없어요</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((a, i) => (
            <li
              key={a.id}
              className="bg-sf border border-bd2 rounded-2xl px-4 py-3 flex items-center gap-3"
            >
              {/* 프로젝트 색상 점 */}
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: a.project.color ?? "var(--color-ac)" }}
              />

              {/* 단계 정보 */}
              <div className="flex-1 min-w-0">
                <p
                  className={[
                    "text-sm font-bold leading-5 truncate",
                    a.step.done ? "line-through text-mu" : "text-tx",
                  ].join(" ")}
                >
                  {a.step.title}
                </p>
                <p className="text-[11px] text-mu truncate">{a.project.title}</p>
              </div>

              {/* ▲/▼ 우선순위 버튼 */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => void swap(i, i - 1)}
                  disabled={i === 0}
                  className="text-mu disabled:opacity-30 cursor-pointer hover:text-tx transition-colors"
                  aria-label="위로"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => void swap(i, i + 1)}
                  disabled={i === sorted.length - 1}
                  className="text-mu disabled:opacity-30 cursor-pointer hover:text-tx transition-colors"
                  aria-label="아래로"
                >
                  ▼
                </button>
              </div>

              {/* 삭제 버튼 */}
              <button
                type="button"
                onClick={() => void handleDelete(a.id)}
                className="text-mu hover:text-red-400 transition-colors cursor-pointer"
                aria-label="배정 삭제"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
