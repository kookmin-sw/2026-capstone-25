// 캘린더 탭 날짜 배정 바텀 시트.
// 선택 날짜에 배정할 단계를 고른다 — 프로젝트별로 nextStep만 표시.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { listProjects, type ProjectSummary } from "../../services/projects";
import { createAssignment, type CalendarAssignment } from "../../services/calendar";

type Props = {
  date: string;
  dateLabel: string;
  existingAssignments: CalendarAssignment[];
  onClose: () => void;
  onAssigned: () => void;
};

export default function SchedulePicker({ date, dateLabel, existingAssignments, onClose, onAssigned }: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listProjects()
      .then((data) => setProjects(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const assignedOnDate = new Set(
    existingAssignments.filter((a) => a.date === date).map((a) => a.step.id),
  );

  // 미완료 + nextStep 있는 것만
  const schedulable = projects.filter((p) => p.progress < 100 && p.nextStep);

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
    try {
      await Promise.all([...selected].map((stepId) => createAssignment(stepId, date)));
      onAssigned();
      onClose();
    } catch {
      alert("배정에 실패했어요.");
    } finally {
      setSaving(false);
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

        {/* 리스트 */}
        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {loading ? (
            <p className="text-center py-10 text-sm text-mu">불러오는 중...</p>
          ) : schedulable.length === 0 ? (
            <p className="text-center py-10 text-sm text-mu">진행 중인 할 일이 없어요</p>
          ) : (
            <div className="space-y-2.5">
              {schedulable.map((p) => {
                const stepId = p.nextStep!.id;
                const already = assignedOnDate.has(stepId);
                const sel = selected.has(stepId);
                const color = p.color ?? "var(--color-ac)";

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={already}
                    onClick={() => !already && toggle(stepId)}
                    className={[
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl border-[1.5px] text-left transition-all",
                      already
                        ? "opacity-50 border-bd2 bg-fa"
                        : sel
                        ? "border-ac bg-ac-s"
                        : "border-bd2 bg-sf hover:border-bd",
                    ].join(" ")}
                  >
                    {/* 체크 */}
                    <span
                      className={[
                        "w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-all",
                        sel ? "border-ac bg-ac" : "border-bd bg-sf",
                      ].join(" ")}
                    >
                      {sel && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6.2l2.3 2.3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>

                    {/* 색상 점 */}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${color}25` }}
                    />

                    {/* 텍스트 */}
                    <div className="min-w-0 flex-1">
                      {!p.isSingle && (
                        <p className="text-[11px] font-bold text-mu truncate">{p.title}</p>
                      )}
                      <p className="text-sm font-bold text-tx truncate">
                        {p.nextStep!.title}
                        {already && <span className="ml-1.5 text-[10px] text-mu2 font-semibold">(이미 추가됨)</span>}
                      </p>
                    </div>
                  </button>
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
