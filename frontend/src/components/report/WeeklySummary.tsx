import type { WeekData } from "../../services/report";

function fmtTime(mins: number): string {
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

type Props = { weeks: WeekData[] };

export default function WeeklySummary({ weeks }: Props) {
  const thisWeek = weeks[3] ?? { mins: 0, done: 0 };
  const lastWeek = weeks[2] ?? { mins: 0, done: 0 };
  const diffMins = thisWeek.mins - lastWeek.mins;
  const diffDone = thisWeek.done - lastWeek.done;

  const maxMins = Math.max(...weeks.map((w) => w.mins), 1);
  const maxDone = Math.max(...weeks.map((w) => w.done), 1);

  return (
    <div className="bg-sf border border-bd2 rounded-[20px] shadow-[0_2px_6px_rgba(180,110,70,0.06)] p-[18px]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px] font-black text-tx">한 달 추이</span>
        <div className="flex gap-2.5">
          <div className="flex items-center gap-1">
            <div className="w-[7px] h-[7px] rounded-full bg-ac" />
            <span className="text-[10px] text-mu font-semibold">집중</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-[7px] h-[7px] rounded-[2px] bg-tx" />
            <span className="text-[10px] text-mu font-semibold">완료</span>
          </div>
        </div>
      </div>

      {/* 막대 차트 — 프로토타입 기준: 막대 13px 고정폭, gap 4px, radius 4 4 2 2 */}
      <div className="flex items-end justify-between" style={{ height: 104 }}>
        {weeks.map((w, i) => {
          const isNow = i === 3;
          const mH = Math.max(8, Math.round((w.mins / maxMins) * 90));
          const dH = Math.max(8, Math.round((w.done / maxDone) * 90));
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-[6px]">
              <div className="flex items-end" style={{ height: 94, gap: 4 }}>
                {/* 집중 막대 */}
                <div
                  style={{
                    width: 13,
                    height: mH,
                    background: isNow ? "var(--color-ac-grad)" : "var(--color-ac-s2)",
                    borderRadius: "4px 4px 2px 2px",
                    opacity: isNow ? 1 : 0.6,
                  }}
                />
                {/* 완료 막대 */}
                <div
                  style={{
                    width: 13,
                    height: dH,
                    background: isNow ? "var(--color-tx)" : "var(--color-mu)",
                    borderRadius: "4px 4px 2px 2px",
                    opacity: isNow ? 1 : 0.6,
                  }}
                />
              </div>
              <span
                className="text-[10px] font-bold whitespace-nowrap"
                style={{ color: isNow ? "var(--color-ac-d)" : "var(--color-mu)" }}
              >
                {w.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* 지난주 대비 */}
      <div className="flex gap-2 mt-3.5 pt-3 border-t border-bd2">
        <div
          className="flex-1 px-3 py-2 rounded-[10px]"
          style={{ background: diffMins >= 0 ? "var(--color-gn-s)" : "#FFF0E0" }}
        >
          <p
            className="text-[14px] font-black"
            style={{ color: diffMins >= 0 ? "var(--color-gn)" : "#E67E22" }}
          >
            {diffMins >= 0 ? "▲" : "▼"} {fmtTime(Math.abs(diffMins))}
          </p>
          <p className="text-[10px] text-mu font-semibold mt-0.5">지난주 대비 집중</p>
        </div>
        <div
          className="flex-1 px-3 py-2 rounded-[10px]"
          style={{ background: diffDone >= 0 ? "var(--color-gn-s)" : "#FFF0E0" }}
        >
          <p
            className="text-[14px] font-black"
            style={{ color: diffDone >= 0 ? "var(--color-gn)" : "#E67E22" }}
          >
            {diffDone >= 0 ? "▲" : "▼"} {Math.abs(diffDone)}개
          </p>
          <p className="text-[10px] text-mu font-semibold mt-0.5">지난주 대비 완료</p>
        </div>
      </div>
    </div>
  );
}
