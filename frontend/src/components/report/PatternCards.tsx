import type { AiPattern } from "../../services/report";

type Props = { patterns: AiPattern[] | null; loading: boolean };

export default function PatternCards({ patterns, loading }: Props) {
  return (
    <div className="bg-sf border border-bd2 rounded-[20px] shadow-[0_2px_6px_rgba(180,110,70,0.06)] p-[18px]">
      <p className="text-[13px] font-black text-tx mb-3.5">발견된 패턴</p>
      {loading || !patterns ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-[62px] rounded-[14px] bg-fa animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {patterns.map((p, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-[14px] px-3.5 py-3"
              style={{ background: "var(--color-fa)" }}
            >
              <span className="text-[22px] leading-none shrink-0 mt-0.5">{p.emoji}</span>
              <div>
                <p className="text-[12.5px] font-black text-tx mb-0.5">{p.title}</p>
                <p className="text-[11.5px] text-mu font-medium leading-snug">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
