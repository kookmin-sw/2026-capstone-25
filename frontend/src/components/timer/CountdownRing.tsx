// 원형 SVG 프로그레스 링 — 타이머 진행률을 시각화한다.
// elapsed / total 비율로 오렌지 그라디언트 호를 그린다.
type Props = {
  totalSec: number;
  elapsedSec: number;
  isPaused: boolean;
};

const R = 100;
const CX = 120;
const CY = 120;
const CIRC = 2 * Math.PI * R;

export default function CountdownRing({ totalSec, elapsedSec, isPaused }: Props) {
  const pct = totalSec === 0 ? 0 : elapsedSec / totalSec;
  const offset = CIRC * (1 - pct);

  const rem = Math.max(0, totalSec - elapsedSec);
  const h = Math.floor(rem / 3600);
  const m = Math.floor((rem % 3600) / 60);
  const s = rem % 60;
  const timeLabel = `${h ? String(h).padStart(2, "0") + ":" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <div className="relative w-[240px] h-[240px] shrink-0">
      <svg
        width="240"
        height="240"
        viewBox="0 0 240 240"
        style={{ transform: "rotate(-90deg)", display: "block" }}
      >
        {/* 배경 링 */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--color-bd)" strokeWidth="9" />
        {/* 진행 링 — 오렌지 그라디언트 */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="url(#timer-grad)"
          strokeWidth="9"
          strokeDasharray={CIRC.toFixed(2)}
          strokeDashoffset={offset.toFixed(2)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <defs>
          <linearGradient id="timer-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFB59C" />
            <stop offset="100%" stopColor="#FF5722" />
          </linearGradient>
        </defs>
      </svg>

      {/* 링 중앙 — 시간 + 상태 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span
          className="font-black text-tx leading-none"
          style={{ fontSize: "60px", letterSpacing: "-2px", fontVariantNumeric: "tabular-nums" }}
        >
          {timeLabel}
        </span>
        <span
          className="text-[11px] font-bold tracking-widest"
          style={{ color: isPaused ? "var(--color-yl, #FFD88A)" : "var(--color-ac)" }}
        >
          {isPaused ? "일시정지" : "집중 중"}
        </span>
      </div>
    </div>
  );
}
