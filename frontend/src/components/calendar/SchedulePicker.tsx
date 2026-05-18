// 캘린더 탭 날짜 배정 바텀 시트.
// 프로젝트별로 모든 미완료 단계를 펼쳐서 선택.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createProject, listProjects, type ProjectSummary } from "../../services/projects";
import { createAssignment, type CalendarAssignment } from "../../services/calendar";
import LoadingState from "../LoadingState";

type Props = {
  date: string;
  dateLabel: string;
  existingAssignments: CalendarAssignment[];
  onClose: () => void;
  onAssigned: () => void;
};

function dDayLabel(due: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(due + "T00:00:00");
  const diff = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `D+${Math.abs(diff)}`;
  if (diff === 0) return "D-Day";
  return `D-${diff}`;
}

export default function SchedulePicker({ date, dateLabel, existingAssignments, onClose, onAssigned }: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  useEffect(() => {
    listProjects()
      .then((data) => setProjects(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const assignedOnDate = new Set(
    existingAssignments.filter((a) => a.date === date).map((a) => a.step.id),
  );

  const schedulable = projects.filter((p) => p.schedulableSteps.length > 0);

  function toggle(stepId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  }

  async function handleConfirm() {
    if (selected.size === 0) return;
    setSaving(true);
    const selectedIds = [...selected];
    try {
      const results = await Promise.allSettled(
        selectedIds.map((stepId) => createAssignment(stepId, date)),
      );
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        const reason = failed[0] as PromiseRejectedResult;
        const message = reason.reason instanceof Error ? reason.reason.message : "배정에 실패했어요.";
        alert(
          failed.length === selectedIds.length
            ? message
            : `${selectedIds.length - failed.length}개는 추가했고, ${failed.length}개는 실패했어요.\n${message}`,
        );
      }
      onAssigned();
      if (failed.length === 0) onClose();
    } catch {
      alert("배정에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickAdd() {
    const title = quickTitle.trim();
    if (!title) return;

    setQuickSaving(true);
    try {
      const { firstStepId } = await createProject({
        title,
        goal: title,
        isSingle: true,
        steps: [],
      });
      if (!firstStepId) throw new Error("단일 작업 단계를 찾지 못했어요.");

      await createAssignment(firstStepId, date);
      setQuickTitle("");
      onAssigned();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "단일 작업 추가에 실패했어요.");
    } finally {
      setQuickSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-sf rounded-t-2xl px-[18px] pt-5 pb-8 max-h-[75vh] flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-base font-black text-tx">{dateLabel}</p>
          <button type="button" onClick={onClose} className="p-1 text-mu hover:text-tx transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs font-bold text-mu mb-4">할 일을 선택하세요</p>

        <div className="mb-4 flex gap-2">
          <input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleQuickAdd();
            }}
            placeholder="단일 작업 바로 추가"
            className="min-w-0 flex-1 rounded-xl border border-bd bg-sf px-3 py-2.5 text-sm text-tx outline-none placeholder:text-mu2 focus:border-ac"
          />
          <button
            type="button"
            onClick={() => void handleQuickAdd()}
            disabled={!quickTitle.trim() || quickSaving}
            className="rounded-xl bg-ac px-3.5 py-2.5 text-sm font-black text-white hover:opacity-90 disabled:opacity-40"
          >
            {quickSaving ? "추가 중" : "바로 추가"}
          </button>
        </div>

        {/* 리스트 */}
        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {loading ? (
            <LoadingState title="할 일을 불러오고 있어요" className="max-w-[360px]" />
          ) : schedulable.length === 0 ? (
            <p className="text-center py-10 text-sm text-mu">진행 중인 할 일이 없어요</p>
          ) : (
            <div className="space-y-5">
              {schedulable.map((p) => {
                const color = p.color ?? "var(--color-ac)";
                const dd = p.due ? dDayLabel(p.due) : null;

                return (
                  <div key={p.id}>
                    {/* 프로젝트 헤더 (isSingle이면 숨김) */}
                    {!p.isSingle && (
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${color}22` }}
                        />
                        <span className="min-w-0 text-[12.5px] font-black text-tx truncate">
                          {p.title}
                        </span>
                        {dd && (
                          <span className="text-[11px] font-medium text-mu2 shrink-0">{dd}</span>
                        )}
                      </div>
                    )}

                    {/* 하위 항목들 — 2차 분해 단계는 부모 아래 들여쓰기로 표시 */}
                    {(() => {
                      const steps = p.schedulableSteps;
                      const parentIds = new Set(steps.filter(s => s.parentStepId).map(s => s.parentStepId!));
                      // parentId → children map
                      const childrenMap = new Map<string, typeof steps>();
                      for (const s of steps) {
                        if (s.parentStepId) {
                          const arr = childrenMap.get(s.parentStepId) ?? [];
                          arr.push(s);
                          childrenMap.set(s.parentStepId, arr);
                        }
                      }

                      function StepBtn({ step, indent }: { step: typeof steps[0]; indent?: boolean }) {
                        const already = assignedOnDate.has(step.id);
                        const sel = selected.has(step.id);
                        return (
                          <button
                            key={step.id}
                            type="button"
                            disabled={already}
                            onClick={() => !already && toggle(step.id)}
                            className={[
                              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-[1.5px] text-left transition-all",
                              already ? "opacity-50 border-bd2 bg-fa cursor-not-allowed"
                                : sel ? "border-ac bg-ac-s"
                                : "border-bd2 bg-sf hover:border-bd",
                            ].join(" ")}
                          >
                            <span className={["w-4 h-4 rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-all", sel ? "border-ac bg-ac" : "border-bd bg-sf"].join(" ")}>
                              {sel && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </span>
                            {p.isSingle && !indent && (
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${color}22` }} />
                            )}
                            <span className="min-w-0 text-[12.5px] font-semibold text-tx truncate">
                              {step.title}
                            </span>
                            {p.isSingle && !indent && dd && (
                              <span className="text-[11px] font-medium text-mu2 shrink-0">{dd}</span>
                            )}
                          </button>
                        );
                      }

                      return (
                        <div className={p.isSingle ? "" : "pl-1 space-y-1.5"}>
                          {steps
                            .filter(s => !s.parentStepId)
                            .map((step) => (
                              <div key={step.id} className={parentIds.has(step.id) ? "space-y-1.5" : undefined}>
                                {parentIds.has(step.id) ? (
                                  <>
                                    {/* 부모 단계 — 선택 불가, 그룹 헤더 역할 */}
                                    <div className="flex items-center gap-2 px-1 pt-0.5">
                                      <span className="w-[3px] h-3.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                      <span className="text-[12px] font-bold text-tx2 truncate">{step.title}</span>
                                    </div>
                                    {/* 자식 단계들 — 들여쓰기 */}
                                    <div
                                      className="ml-1.5 border-l-2 pl-3 space-y-1.5"
                                      style={{ borderColor: `${color}33` }}
                                    >
                                      {(childrenMap.get(step.id) ?? []).map((child) => (
                                        <StepBtn key={child.id} step={child} indent />
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  <StepBtn step={step} />
                                )}
                              </div>
                            ))}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-2.5 mt-4 pt-3 border-t border-bd2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-bd bg-sf py-3 text-sm font-black text-mu hover:bg-fa transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={selected.size === 0 || saving}
            className="flex-1 rounded-xl bg-ac text-white py-3 text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? "추가 중..." : `추가하기${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
