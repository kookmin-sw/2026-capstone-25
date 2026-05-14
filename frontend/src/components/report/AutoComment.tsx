import type { AiSummary } from "../../services/report";

type Props = { ai: AiSummary | null; loading: boolean };

export default function AutoComment({ ai, loading }: Props) {
  const headline = ai?.headline ?? "분석 중이에요";
  const goods = ai?.goods ?? [];
  const bads = ai?.bads ?? [];

  return (
    <div
      className="rounded-[20px] px-[22px] py-5"
      style={{ background: "var(--color-ac-grad)" }}
    >
      <p className="text-[11px] font-bold text-white/70 tracking-[0.5px] mb-1.5">
        이번 주 리포트
      </p>
      <p className="text-[21px] font-black text-white leading-snug mb-4">
        {loading ? "AI가 분석 중이에요..." : headline}
      </p>
      {!loading && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white/20 rounded-xl px-3.5 py-3">
            <p className="text-[11px] font-black text-white/90 mb-2 tracking-[0.2px]">잘한 점 ✓</p>
            <div className="flex flex-col gap-1.5">
              {(goods.length > 0 ? goods : ["첫 발걸음을 뗐어요"]).slice(0, 2).map((g, i) => (
                <p key={i} className="text-[12px] text-white/90 font-medium leading-snug">{g}</p>
              ))}
            </div>
          </div>
          <div className="bg-black/10 rounded-xl px-3.5 py-3">
            <p className="text-[11px] font-black text-white/90 mb-2 tracking-[0.2px]">아쉬운 점 ·</p>
            <div className="flex flex-col gap-1.5">
              {(bads.length > 0 ? bads : ["딱히 아쉬운 점이 없어요 👍"]).slice(0, 2).map((b, i) => (
                <p key={i} className="text-[12px] text-white/85 font-medium leading-snug">{b}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
