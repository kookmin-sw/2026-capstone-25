// 월간 뷰 — 7×6 그리드 + 프로젝트 칩(mo-projbox) + 마감일 D-Day.
// 내비게이션(이전/다음 달)은 CalendarPage 헤더에서 담당한다.
import type { CalendarAssignment, DueProject } from "../../services/calendar";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getDday(due: string, today: string): number {
  const a = new Date(due).getTime();
  const b = new Date(today).getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

type Props = {
  year: number;
  month: number;        // 0-indexed
  assignments: CalendarAssignment[];
  dueProjects: DueProject[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
};

export default function MonthGrid({ year, month, assignments, dueProjects, selectedDate, onSelectDate }: Props) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const cells: (Date | null)[] = [];
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const assignMap: Record<string, CalendarAssignment[]> = {};
  for (const a of assignments) {
    if (!assignMap[a.date]) assignMap[a.date] = [];
    assignMap[a.date].push(a);
  }

  // 날짜별 첫 번째 마감 프로젝트
  const dueMap: Record<string, DueProject> = {};
  for (const p of dueProjects) {
    if (!dueMap[p.due]) dueMap[p.due] = p;
  }

  return (
    <div className="flex flex-col">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-mu py-1">
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="min-h-[66px]" />;

          const str = toDateStr(year, month, date.getDate());
          const isToday = str === todayStr;
          const isSelected = str === selectedDate;
          const dayAssignments = assignMap[str] ?? [];
          const shown = dayAssignments.slice(0, 2);
          const rest = dayAssignments.length - shown.length;
          const dueProject = dueMap[str];
          const dday = dueProject ? getDday(str, todayStr) : null;

          return (
            <button
              key={str}
              type="button"
              onClick={() => onSelectDate(str)}
              className="flex flex-col gap-0.5 p-1 rounded-lg cursor-pointer hover:bg-fa transition-colors min-h-[66px]"
            >
              {/* 날짜 숫자 */}
              <div className="flex justify-center">
                <span
                  className={[
                    "text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-tight",
                    isSelected && isToday
                      ? "bg-ac text-white"
                      : isSelected
                      ? "bg-tx text-bg"
                      : isToday
                      ? "bg-ac text-white"
                      : "text-tx",
                  ].join(" ")}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* 마감일 D-Day */}
              {dday !== null && (
                <span
                  className="text-[9px] font-black px-1 py-px rounded leading-tight text-white truncate"
                  style={{ backgroundColor: dueProject!.color ?? "var(--color-ac)" }}
                >
                  {dday === 0 ? "D-Day" : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`}
                </span>
              )}

              {/* 배정된 단계 칩 (최대 2개) */}
              {shown.map((a) => (
                <span
                  key={a.id}
                  className="text-[9.5px] font-black px-1 py-px rounded leading-tight text-white truncate"
                  style={{ backgroundColor: a.project.color ?? "var(--color-ac)" }}
                >
                  {a.step.title}
                </span>
              ))}
              {rest > 0 && (
                <span className="text-[9px] font-bold text-mu bg-fa px-1 py-px rounded leading-tight text-center">
                  +{rest}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
