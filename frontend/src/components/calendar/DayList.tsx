// 선택 날짜의 배정된 단계 카드 리스트.
// 프로토타입 .todo-row 스타일 기준: padding 12px 14px, gap 10px, radius 12px
import { useNavigate } from "react-router-dom";
import { Check, ChevronUp, ChevronDown } from "lucide-react";
import EmptyState from "../EmptyState";
import { patchAssignment, type CalendarAssignment } from "../../services/calendar";
import { toggleStep } from "../../services/projects";
import { useToast } from "../../lib/toast";

type Props = {
  assignments: CalendarAssignment[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleDone: (stepId: string, done: boolean) => void;
  onPriorityChange: (id: string, priority: number) => void;
};

function dDayLabel(due: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(due + "T00:00:00");
  const diff = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `D+${Math.abs(diff)}`;
  if (diff === 0) return "D-Day";
  return `D-${diff}`;
}

export default function DayList({ assignments, selectionMode, selectedIds, onToggleSelect, onToggleDone, onPriorityChange }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const sorted = [...assignments].sort((a, b) => a.priority - b.priority);

  async function swap(indexA: number, indexB: number) {
    if (indexB < 0 || indexB >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[indexA], reordered[indexB]] = [reordered[indexB], reordered[indexA]];
    reordered.forEach((a, idx) => onPriorityChange(a.id, idx));
    await Promise.all(
      reordered.map((a, idx) => patchAssignment(a.id, { priority: idx })),
    ).catch(() => {});
  }

  async function handleToggleDone(stepId: string, currentDone: boolean) {
    onToggleDone(stepId, !currentDone);
    await toggleStep(stepId, !currentDone).catch((e: unknown) => {
      onToggleDone(stepId, currentDone);
      showToast(e instanceof Error ? e.message : "완료 상태 변경에 실패했어요.");
    });
  }

  return (
    <div className="flex-1">
      {sorted.length === 0 ? (
        <EmptyState emoji="📭" title="배정된 단계가 없어요" />
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((a, i) => {
            const color = a.project.color ?? "var(--color-ac)";
            const isSelected = selectedIds.has(a.id);
            const dd = a.project.due ? dDayLabel(a.project.due) : null;
            const showProjectTitle = a.project.title !== a.step.title;

            return (
              <li
                key={a.id}
                className={[
                  "bg-sf border rounded-xl flex items-center gap-[10px] transition-colors",
                  "px-[14px] py-3",
                  selectionMode ? "cursor-pointer" : "",
                  isSelected ? "border-ac bg-ac-s" : "border-bd2",
                ].join(" ")}
                onClick={selectionMode ? () => onToggleSelect(a.id) : undefined}
              >
                {/* 선택 모드: 왼쪽 체크박스 */}
                {selectionMode && (
                  <span
                    className={[
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                      isSelected ? "border-ac bg-ac" : "border-bd",
                    ].join(" ")}
                  >
                    {isSelected && <Check size={10} strokeWidth={3} color="white" />}
                  </span>
                )}

                {/* 프로젝트 색상 점 */}
                {!selectionMode && (
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 0 3px ${color}25`,
                    }}
                  />
                )}

                {/* 단계 정보 */}
                <div className="flex-1 min-w-0">
                  <p
                    className={[
                      "text-[13.5px] font-bold truncate leading-5",
                      a.step.done ? "line-through text-mu" : "text-tx",
                    ].join(" ")}
                  >
                    {a.step.title}
                  </p>
                  {/* 프로젝트명 + D-Day */}
                  {(showProjectTitle || dd) && (
                    <p className="text-[11.5px] text-mu mt-0.5 truncate">
                      {showProjectTitle && a.project.title}
                      {dd && (
                        <span className="font-medium text-tx">
                          {showProjectTitle ? " · " : ""}
                          {dd}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* 일반 모드: 시작 + 체크 + ▲▼ */}
                {!selectionMode && (
                  <>
                    {!a.step.done && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/timer/${a.step.id}`); }}
                        className="shrink-0 bg-fa text-tx2 border border-bd rounded-xl px-2.5 py-1 text-xs font-black hover:bg-ac-s hover:text-ac-d hover:border-ac transition-colors cursor-pointer"
                      >
                        시작
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void handleToggleDone(a.step.id, a.step.done); }}
                      className={[
                        "shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-150 cursor-pointer",
                        a.step.done
                          ? "bg-gn border-gn"
                          : "bg-transparent border-bd2 hover:border-gn",
                      ].join(" ")}
                      aria-label={a.step.done ? "완료 취소" : "완료 표시"}
                    >
                      {a.step.done && <Check size={14} strokeWidth={2.5} color="white" />}
                    </button>
                    <div className="flex flex-col shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void swap(i, i - 1); }}
                        disabled={i === 0}
                        className="p-0.5 text-mu hover:text-tx disabled:opacity-30 cursor-pointer disabled:cursor-default"
                        aria-label="위로"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void swap(i, i + 1); }}
                        disabled={i === sorted.length - 1}
                        className="p-0.5 text-mu hover:text-tx disabled:opacity-30 cursor-pointer disabled:cursor-default"
                        aria-label="아래로"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
