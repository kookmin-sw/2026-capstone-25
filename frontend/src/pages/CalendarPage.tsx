// 캘린더 탭 — 주간/월간 뷰를 토글한다.
// 주간: WeekStrip(7일 스트립) + DayList(선택일 단계 카드)
// 월간: MonthGrid(7×6 달력 + 마감일 D-Day)
// 뷰 상태는 세션 내 유지(useState), 새로고침 시 주간으로 초기화.
import { useEffect, useState } from "react";
import WeekStrip from "../components/calendar/WeekStrip";
import DayList from "../components/calendar/DayList";
import MonthGrid from "../components/calendar/MonthGrid";
import { listAssignments, type CalendarAssignment } from "../services/calendar";

type ViewMode = "week" | "month";

// YYYY-MM-DD 형식 문자열 반환
function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// 주간 뷰 조회 범위: selectedDate가 속한 주의 일~토
function getWeekRange(dateStr: string): { from: string; to: string } {
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: toDateStr(start), to: toDateStr(end) };
}

// 월간 뷰 조회 범위: 해당 월의 1일~말일
function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export default function CalendarPage() {
  const today = new Date();
  const [view, setView] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(toDateStr(today));
  const [monthYear, setMonthYear] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const [assignments, setAssignments] = useState<CalendarAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 뷰 또는 선택 날짜/월이 바뀌면 배정 목록을 다시 조회한다.
  useEffect(() => {
    const range =
      view === "week"
        ? getWeekRange(selectedDate)
        : getMonthRange(monthYear.year, monthYear.month);

    setLoading(true);
    setError(null);

    listAssignments(range.from, range.to)
      .then(setAssignments)
      .catch(() => setError("일정을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, [view, selectedDate, monthYear]);

  // 배정 삭제 후 낙관적 UI 갱신
  function handleDelete(id: string) {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  // 우선순위 변경 후 낙관적 UI 갱신
  function handlePriorityChange(id: string, priority: number) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, priority } : a)),
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-bg">
      {/* ── 뷰 토글 — 세그먼트 컨트롤 ── */}
      <div className="flex gap-1 mx-4 mt-4 p-1 bg-fa border border-bd rounded-xl">
        {(["week", "month"] as ViewMode[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={[
              "flex-1 py-2 rounded-lg text-sm font-black transition-colors cursor-pointer",
              view === v ? "bg-sf shadow-sm text-tx border border-bd" : "text-mu",
            ].join(" ")}
          >
            {v === "week" ? "주간" : "월간"}
          </button>
        ))}
      </div>

      {/* ── 주간 뷰 ── */}
      {view === "week" && (
        <>
          <WeekStrip
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            onToday={() => setSelectedDate(toDateStr(new Date()))}
          />
          {loading ? (
            <p className="text-center text-mu text-sm mt-10">불러오는 중...</p>
          ) : error ? (
            <p className="text-center text-red-400 text-sm mt-10">{error}</p>
          ) : (
            <DayList
              date={selectedDate}
              assignments={assignments.filter((a) => a.date === selectedDate)}
              onDelete={handleDelete}
              onPriorityChange={handlePriorityChange}
            />
          )}
        </>
      )}

      {/* ── 월간 뷰 ── */}
      {view === "month" && (
        loading ? (
          <p className="text-center text-mu text-sm mt-10">불러오는 중...</p>
        ) : error ? (
          <p className="text-center text-red-400 text-sm mt-10">{error}</p>
        ) : (
          <MonthGrid
            year={monthYear.year}
            month={monthYear.month}
            assignments={assignments}
            onPrev={() =>
              setMonthYear(({ year, month }) =>
                month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
              )
            }
            onNext={() =>
              setMonthYear(({ year, month }) =>
                month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
              )
            }
            onSelectDate={(date) => {
              setSelectedDate(date);
              setView("week");
            }}
          />
        )
      )}
    </div>
  );
}
