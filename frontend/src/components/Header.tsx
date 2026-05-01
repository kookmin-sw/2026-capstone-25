// 상단 헤더 — §2.3
// 좌측: 발바닥 SVG + "한발짝" (Gaegu = font-title, 첫 글자 강조)
// 우측: "오늘 N분" 집중 시간 필 + 펄스 점.
// 색상은 index.css 의 디자인 토큰을 사용한다.

type Props = {
  todayMinutes?: number; // 오늘 누적 집중 시간(분)
};

export default function Header({ todayMinutes = 0 }: Props) {
  return (
    <header
      className={[
        // 헤더 본체 — 좌우 22px·상하 14/16px (데스크탑은 18/40/20)
        "bg-sf px-[22px] pt-[14px] pb-4 lg:py-[18px] lg:pt-[18px] lg:pb-5 lg:px-10",
        "flex items-center justify-between shrink-0 relative",
        // 하단 그라디언트 1px 보더 — 좌우 22px(데스크탑 40px) 안쪽
        "after:content-[''] after:absolute after:left-[22px] after:right-[22px] lg:after:left-10 lg:after:right-10 after:bottom-0 after:h-px",
        "after:bg-[linear-gradient(90deg,transparent,var(--color-bd)_30%,var(--color-bd)_70%,transparent)]",
      ].join(" ")}
    >
      {/* 좌측 — 로고 + 워드마크 */}
      <div className="flex items-center gap-2.5">
        <div
          aria-hidden
          className={[
            "w-[34px] h-[34px] flex items-center justify-center shrink-0",
            "transition-transform duration-300 ease-[cubic-bezier(.5,1.5,.5,1)]",
            "-rotate-[8deg] hover:rotate-[5deg] hover:scale-110",
          ].join(" ")}
        >
          <svg width="28" height="32" viewBox="0 0 28 36" fill="none">
            {/* 발바닥(투박한 손그림) */}
            <path
              d="M8.5 32c-2.5 1-4.5-0.5-4.8-3-.4-3 1-6.5 2.2-9.5.8-2 1.5-3.5 2.5-5 1.2-1.8 2.5-3 4-3.8 1.8-1 3.5-.8 4.8.2 1.5 1.2 2 3.2 1.8 5.8-.2 2.5-1 5.2-2.2 8-1 2.3-2.2 4.5-3.8 5.8-1.2 1-2.8 1.8-4.5 1.5z"
              stroke="var(--color-ac-d)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="var(--color-ac-s)"
            />
            {/* 엄지발가락 */}
            <ellipse cx="9" cy="9.5" rx="3" ry="3.5" stroke="var(--color-ac-d)" strokeWidth="1.8" fill="var(--color-ac-s)" transform="rotate(-10 9 9.5)" />
            {/* 둘째 */}
            <ellipse cx="14.5" cy="7.5" rx="2.3" ry="3" stroke="var(--color-ac-d)" strokeWidth="1.6" fill="var(--color-ac-s)" transform="rotate(5 14.5 7.5)" />
            {/* 셋째 */}
            <ellipse cx="19" cy="9" rx="2" ry="2.7" stroke="var(--color-ac-d)" strokeWidth="1.6" fill="var(--color-ac-s)" transform="rotate(12 19 9)" />
            {/* 넷째 */}
            <ellipse cx="22.5" cy="12" rx="1.7" ry="2.3" stroke="var(--color-ac-d)" strokeWidth="1.5" fill="var(--color-ac-s)" transform="rotate(20 22.5 12)" />
            {/* 새끼 */}
            <ellipse cx="24.5" cy="15.5" rx="1.4" ry="2" stroke="var(--color-ac-d)" strokeWidth="1.5" fill="var(--color-ac-s)" transform="rotate(30 24.5 15.5)" />
          </svg>
        </div>
        {/* 워드마크 — Gaegu (font-title), 첫 글자만 ac-d */}
        <div className="font-title text-[24px] font-bold tracking-[-0.3px] text-tx">
          <em className="not-italic text-ac-d">한</em>발짝
        </div>
      </div>

      {/* 우측 — 오늘 집중 시간 필 */}
      <div
        className={[
          "flex items-center gap-1.5",
          "bg-ac-s text-ac-d border border-ac-s2",
          "text-xs font-bold px-3.5 py-2 rounded-3xl",
        ].join(" ")}
      >
        <span
          aria-hidden
          className={[
            "w-1.5 h-1.5 rounded-full bg-ac",
            // 옅은 ac 그림자(rgba) 는 토큰화하지 않고 원본 hex 의 알파 변형을 유지
            "shadow-[0_0_0_3px_rgba(255,107,61,0.18)]",
            "animate-pulse",
          ].join(" ")}
        />
        <span>오늘 {todayMinutes}분</span>
      </div>
    </header>
  );
}
