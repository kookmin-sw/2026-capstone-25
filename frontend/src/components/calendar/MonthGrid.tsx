// 월간 뷰 — 7×6 그리드 + 프로젝트 색상 칩 + 마감일 D-Day 뱃지.
// onSelectDate: 날짜 셀 클릭 시 주간 뷰로 전환하며 해당 날짜 선택.
// onPrev/onNext: 이전/다음 달 이동.
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarAssignment } from "../../services/calendar";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

// YYYY-MM-DD 형식 문자열 반환
function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}


type Props = {
  year: number;
  month: number;           // 0-indexed
  assignments: CalendarAssignment[];
  onPrev: () => void;
  onNext: () => void;
  onSelectDate: (date: string) => void;
};

export default function MonthGrid({ year, month, assignments, onPrev, onNext, onSelectDate }: Props) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // 해당 월의 달력 셀 목록(6주 × 7일 = 42칸)을 계산한다.
  const cells: (Date | null)[] = [];
  const firstDay = new Date(year, month, 1).getDay(); // 0=일
  const lastDate = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  // 날짜별 배정 목록 맵 (최대 3개 + "+N개")
  const assignMap: Record<string, CalendarAssignment[]> = {};
  for (const a of assignments) {
    if (!assignMap[a.date]) assignMap[a.date] = [];
    assignMap[a.date].push(a);
  }

  return (
    <div className="flex flex-col px-4 pt-4 pb-6">
      {/* 헤더 — 이전/다음 화살표 + 연월 */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onPrev}
          className="p-2 rounded-xl border border-bd bg-sf text-tx2 cursor-pointer"
          aria-label="이전 달"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-base font-black text-tx">
          {year}년 {MONTHS[month]}
        </span>
        <button
          type="button"
          onClick={onNext}
          className="p-2 rounded-xl border border-bd bg-sf text-tx2 cursor-pointer"
          aria-label="다음 달"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-bold text-mu py-1">
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;

          const str = toDateStr(year, month, date.getDate());
          const isToday = str === todayStr;
          const dayAssignments = assignMap[str] ?? [];
          const shown = dayAssignments.slice(0, 3);
          const rest = dayAssignments.length - shown.length;

          return (
            <button
              key={str}
              type="button"
              onClick={() => onSelectDate(str)}
              className="flex flex-col items-center gap-0.5 py-1 rounded-xl cursor-pointer hover:bg-fa transition-colors min-h-[56px]"
            >
              {/* 날짜 숫자 */}
              <span
                className={[
                  "w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-black",
                  isToday ? "bg-ac text-white" : "text-tx2",
                ].join(" ")}
              >
                {date.getDate()}
              </span>

              {/* 프로젝트 색상 칩 (최대 3개) */}
              {shown.map((a) => (
                <span
                  key={a.id}
                  className="w-full max-w-[36px] h-1.5 rounded-full"
                  style={{ backgroundColor: a.project.color ?? "var(--color-ac)" }}
                />
              ))}
              {rest > 0 && (
                <span className="text-[9px] font-bold text-mu">+{rest}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
