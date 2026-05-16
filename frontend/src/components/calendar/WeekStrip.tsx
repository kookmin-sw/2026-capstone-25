// 주간 날짜 스트립 — CalendarPage의 카드(← strip →) 안에 배치된다.
// 오늘: 주황 원형 / 선택일: 검정 배경 / 나머지: bd2 테두리원.
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

type Props = {
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  assignedDates?: Set<string>; // 배정된 날짜 집합 (점 표시용)
};

export default function WeekStrip({ selectedDate, onSelect, assignedDates }: Props) {
  const todayStr = toDateStr(new Date());

  const weekDays = (() => {
    const start = getWeekStart(new Date(selectedDate));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  })();

  return (
    <div className="grid grid-cols-7 gap-0.5 flex-1">
      {weekDays.map((d) => {
        const str = toDateStr(d);
        const isToday = str === todayStr;
        const isSelected = str === selectedDate;
        const hasAssignment = assignedDates?.has(str) ?? false;

        return (
          <button
            key={str}
            type="button"
            onClick={() => onSelect(str)}
            className="flex flex-col items-center gap-1.5 py-1.5 pb-2 rounded-xl cursor-pointer hover:bg-fa transition-colors"
          >
            {/* 요일 */}
            <span
              className={[
                "text-[11px] font-bold tracking-[0.3px]",
                isToday ? "text-ac-d" : "text-mu",
              ].join(" ")}
            >
              {DAYS[d.getDay()]}
            </span>
            {/* 날짜 원형 */}
            <span
              className={[
                "w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] font-black border-[1.5px] transition-all",
                isSelected && isToday
                  ? "bg-ac text-white border-transparent shadow-[0_4px_10px_rgba(255,107,61,0.28)]"
                  : isSelected
                  ? "bg-tx text-bg border-tx"
                  : isToday
                  ? "bg-ac text-white border-transparent shadow-[0_4px_10px_rgba(255,107,61,0.28)]"
                  : "text-tx border-bd2",
              ].join(" ")}
            >
              {d.getDate()}
            </span>
            {/* 배정 점 표시 */}
            <span className={["w-1 h-1 rounded-full transition-all", hasAssignment ? "bg-ac" : "bg-transparent"].join(" ")} />
          </button>
        );
      })}
    </div>
  );
}
