// 주간 뷰 상단 7일 스트립.
// 오늘: 주황 원형 강조 / 선택일: 검정 배경 / 나머지: 기본.
// onSelect: 날짜 클릭 시 부모(CalendarPage)에 선택일 전달.
// onToday: "오늘로" 버튼 클릭 시 오늘 날짜로 이동.

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// YYYY-MM-DD 형식 문자열 반환
function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// 해당 날짜가 속한 주의 일요일을 반환한다.
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

type Props = {
  selectedDate: string;   // YYYY-MM-DD
  onSelect: (date: string) => void;
  onToday: () => void;
};

export default function WeekStrip({ selectedDate, onSelect, onToday }: Props) {
  const todayStr = toDateStr(new Date());

  // selectedDate 기준으로 해당 주 7일을 계산한다.
  const weekDays = (() => {
    const start = getWeekStart(new Date(selectedDate));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  })();

  return (
    <div className="flex items-center gap-1 px-4 pt-4 pb-2">
      {weekDays.map((d) => {
        const str = toDateStr(d);
        const isToday = str === todayStr;
        const isSelected = str === selectedDate;

        return (
          <button
            key={str}
            type="button"
            onClick={() => onSelect(str)}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          >
            {/* 요일 이름 */}
            <span
              className={[
                "text-[10px] font-bold",
                isToday ? "text-ac" : "text-mu",
              ].join(" ")}
            >
              {DAYS[d.getDay()]}
            </span>
            {/* 날짜 원형 */}
            <span
              className={[
                "w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black transition-colors",
                isSelected
                  ? "bg-tx text-bg"
                  : isToday
                  ? "bg-ac-s text-ac-d"
                  : "text-tx2",
              ].join(" ")}
            >
              {d.getDate()}
            </span>
          </button>
        );
      })}

      {/* 오늘로 이동 버튼 — 선택일이 오늘이 아닐 때만 표시 */}
      {selectedDate !== todayStr && (
        <button
          type="button"
          onClick={onToday}
          className="ml-1 shrink-0 text-[11px] font-bold text-ac border border-ac rounded-lg px-2 py-1 cursor-pointer"
        >
          오늘
        </button>
      )}
    </div>
  );
}
