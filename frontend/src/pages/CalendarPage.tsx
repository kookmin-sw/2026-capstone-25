// 캘린더 탭 — 프로토타입 hanbaljjak_v12 일정 탭 레이아웃 기준.
// 헤더: "일정" 타이틀 + 오늘날짜 버튼 + 주간/월간 토글.
// 주간: 연월 라벨 + 카드(← WeekStrip →) + DayList.
// 월간: ← 연월 → + 카드(MonthGrid) + DayList.
// DayList는 주간·월간 모두 항상 하단에 표시.
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import WeekStrip from "../components/calendar/WeekStrip";
import DayList from "../components/calendar/DayList";
import MonthGrid from "../components/calendar/MonthGrid";
import SchedulePicker from "../components/calendar/SchedulePicker";
import {
  listAssignments,
  deleteAssignment,
  type CalendarAssignment,
  type DueProject,
} from "../services/calendar";
import LoadingState from "../components/LoadingState";

type ViewMode = "week" | "month";

const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const DAY_NAMES = ["일","월","화","수","목","금","토"];

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function getWeekRange(dateStr: string): { from: string; to: string } {
  const d = new Date(dateStr);
  const start = getWeekStart(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: toDateStr(start), to: toDateStr(end) };
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

// 주간 스트립 상단에 표시할 연월 라벨 (주가 두 달에 걸쳐 있으면 "5월 – 6월")
function weekLabel(dateStr: string): string {
  const start = getWeekStart(new Date(dateStr));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const y = start.getFullYear();
  if (start.getMonth() === end.getMonth()) {
    return `${y}년 ${start.getMonth() + 1}월`;
  }
  return `${y}년 ${start.getMonth() + 1}월 – ${end.getMonth() + 1}월`;
}

export default function CalendarPage() {
  const today = new Date();
  const todayStr = toDateStr(today);

  const [view, setView] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [monthYear, setMonthYear] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const [assignments, setAssignments] = useState<CalendarAssignment[]>([]);
  const [dueProjects, setDueProjects] = useState<DueProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function loadAssignments() {
    const range =
      view === "week"
        ? getWeekRange(selectedDate)
        : getMonthRange(monthYear.year, monthYear.month);

    setLoading(true);
    setError(null);

    listAssignments(range.from, range.to)
      .then(({ assignments: a, dueProjects: d }) => {
        setAssignments(a);
        setDueProjects(d);
      })
      .catch(() => setError("일정을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAssignments();
  }, [view, selectedDate, monthYear]);

  function handleDelete(id: string) {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  function toggleSelectionMode() {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    const ids = [...selectedIds];
    ids.forEach((id) => handleDelete(id));
    setSelectionMode(false);
    setSelectedIds(new Set());
    await Promise.all(ids.map((id) => deleteAssignment(id))).catch(() => {});
  }

  function handlePriorityChange(id: string, priority: number) {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, priority } : a)));
  }

  function handleToggleDone(stepId: string, done: boolean) {
    setAssignments((prev) =>
      prev.map((a) => a.step.id === stepId ? { ...a, step: { ...a.step, done } } : a),
    );
  }

  // 주간 ← → : 7일 이동
  function prevWeek() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(toDateStr(d));
  }
  function nextWeek() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(toDateStr(d));
  }

  // 월간 ← →
  function prevMonth() {
    setMonthYear(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  }
  function nextMonth() {
    setMonthYear(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  }

  // 오늘 버튼: 선택일 오늘로, 월간이면 이번 달로도 복귀
  function jumpToToday() {
    setSelectedDate(todayStr);
    setMonthYear({ year: today.getFullYear(), month: today.getMonth() });
  }

  const isToday = selectedDate === todayStr;

  // 선택일 한국어 라벨 (DayList 위)
  const selDateObj = new Date(`${selectedDate}T00:00:00`);
  const selLabel = isToday
    ? `오늘 (${selDateObj.getMonth() + 1}월 ${selDateObj.getDate()}일 ${DAY_NAMES[selDateObj.getDay()]}요일)`
    : `${selDateObj.getMonth() + 1}월 ${selDateObj.getDate()}일 ${DAY_NAMES[selDateObj.getDay()]}요일`;

  return (
    <div className="flex flex-col min-h-full px-[18px] pt-6 pb-24 gap-4 relative">

      {/* ── 헤더: 타이틀 + 오늘 버튼 + 토글 ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* 오늘 날짜 숫자 버튼 */}
          <button
            type="button"
            onClick={jumpToToday}
            title="오늘로 이동"
            className={[
              "w-8 h-8 rounded-[9px] border-[1.5px] flex items-center justify-center text-[13px] font-black cursor-pointer transition-colors",
              isToday
                ? "bg-ac-s text-ac-d border-ac-s"
                : "bg-sf text-tx border-bd hover:bg-fa",
            ].join(" ")}
          >
            {today.getDate()}
          </button>
          {/* 주간/월간 토글 */}
          <div className="inline-flex bg-fa rounded-[10px] p-[3px] gap-[3px]">
            {(["week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={[
                  "px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-all",
                  view === v
                    ? "bg-sf text-tx shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                    : "text-mu",
                ].join(" ")}
              >
                {v === "week" ? "주간" : "월간"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState title="일정을 불러오고 있어요" className="max-w-[520px]" />
      ) : error ? (
        <p className="text-center text-red-400 text-sm mt-6">{error}</p>
      ) : (
        <>
          {/* ── 주간 뷰 ── */}
          {view === "week" && (
            <>
              {/* 연월 라벨 */}
              <p className="text-[14px] font-black text-tx text-center -mb-2">
                {weekLabel(selectedDate)}
              </p>
              {/* 카드: ← WeekStrip → */}
              <div className="bg-sf border border-bd2 rounded-[20px] shadow-[0_2px_6px_rgba(180,110,70,0.06)] px-1.5 py-2.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevWeek}
                  className="p-1.5 text-tx shrink-0 cursor-pointer rounded-lg hover:bg-fa transition-colors"
                  aria-label="이전 주"
                >
                  <ChevronLeft size={18} />
                </button>
                <WeekStrip
                  selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                  assignedDates={new Set(assignments.map((a) => a.date))}
                />
                <button
                  type="button"
                  onClick={nextWeek}
                  className="p-1.5 text-tx shrink-0 cursor-pointer rounded-lg hover:bg-fa transition-colors"
                  aria-label="다음 주"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </>
          )}

          {/* ── 월간 뷰 ── */}
          {view === "month" && (
            <>
              {/* ← 연월 → */}
              <div className="flex items-center justify-between -mb-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-2 text-tx cursor-pointer rounded-lg hover:bg-fa transition-colors"
                  aria-label="이전 달"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-base font-black text-tx">
                  {monthYear.year}년 {MONTHS[monthYear.month]}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-2 text-tx cursor-pointer rounded-lg hover:bg-fa transition-colors"
                  aria-label="다음 달"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              {/* 카드: MonthGrid */}
              <div className="bg-sf border border-bd2 rounded-[20px] shadow-[0_2px_6px_rgba(180,110,70,0.06)] px-2 py-2.5">
                <MonthGrid
                  year={monthYear.year}
                  month={monthYear.month}
                  assignments={assignments}
                  dueProjects={dueProjects}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              </div>
            </>
          )}

          {/* ── DayList: 항상 표시 ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-mu tracking-[0.5px]">{selLabel}</p>
              {assignments.filter((a) => a.date === selectedDate).length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectionMode}
                  className="text-xs font-black text-mu hover:text-tx transition-colors"
                >
                  {selectionMode ? "취소" : "선택"}
                </button>
              )}
            </div>
            <DayList
              assignments={assignments.filter((a) => a.date === selectedDate)}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleDone={handleToggleDone}
              onPriorityChange={handlePriorityChange}
            />
          </div>

          {/* 선택 모드 하단 삭제 바 */}
          {selectionMode && (
            <div className="fixed bottom-0 left-0 right-0 lg:left-[248px] z-20 border-t border-bd2 bg-sf px-[18px] pt-3 pb-[max(20px,calc(env(safe-area-inset-bottom)+12px))]">
              <button
                type="button"
                onClick={() => void deleteSelected()}
                disabled={selectedIds.size === 0}
                className="w-full rounded-xl bg-fa border border-bd py-3 text-sm font-black text-mu disabled:opacity-40 transition-opacity hover:bg-bd2"
              >
                {selectedIds.size > 0 ? `${selectedIds.size}개 배정 취소` : "항목을 선택하세요"}
              </button>
            </div>
          )}

          {showPicker && (
            <SchedulePicker
              date={selectedDate}
              dateLabel={selLabel}
              existingAssignments={assignments}
              onClose={() => setShowPicker(false)}
              onAssigned={loadAssignments}
            />
          )}
        </>
      )}
      {/* FAB — 할 일 추가 */}
      {!selectionMode && (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="fixed bottom-[calc(80px+env(safe-area-inset-bottom)+8px)] right-[18px] lg:right-[max(18px,calc((100vw-1148px)/2+18px))] w-14 h-14 rounded-full bg-ac text-white text-2xl font-black shadow-[0_4px_16px_rgba(0,0,0,0.18)] flex items-center justify-center z-40 hover:opacity-90 transition-opacity cursor-pointer"
          aria-label="할 일 추가"
        >
          ＋
        </button>
      )}
    </div>
  );
}
