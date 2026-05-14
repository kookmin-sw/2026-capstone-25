type Props = { strategies: string[] | null; loading: boolean };

export default function NextWeekSuggestion({ strategies, loading }: Props) {
  const items = strategies && strategies.length > 0
    ? strategies
    : ["지금 흐름 그대로 유지해봐요"];

  return (
    <div className="bg-sf border border-bd2 rounded-[20px] shadow-[0_2px_6px_rgba(180,110,70,0.06)] px-[18px] py-4">
      <p className="text-[11px] font-bold text-mu tracking-[0.5px] mb-3">다음 주 전략</p>
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded-[10px] bg-fa animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "var(--color-ac-s)" }}
              >
                <span className="text-[10px] font-black" style={{ color: "var(--color-ac)" }}>{i + 1}</span>
              </div>
              <p className="text-[12.5px] font-medium text-tx leading-snug">{s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
