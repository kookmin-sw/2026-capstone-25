import type { AiSummary } from "../../services/report";

type Props = { ai: AiSummary | null; loading: boolean };

export default function UserTypeCard({ ai, loading }: Props) {
  const ut = ai?.userType;

  return (
    <div className="bg-sf border border-bd2 rounded-[20px] shadow-[0_2px_6px_rgba(180,110,70,0.06)] px-[18px] py-4">
      <p className="text-[11px] font-bold text-mu tracking-[0.5px] mb-3">나의 작업 스타일</p>
      {loading || !ut ? (
        <div className="h-12 rounded-xl bg-fa animate-pulse" />
      ) : (
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: "var(--color-ac-s)" }}
          >
            {ut.emoji}
          </div>
          <div>
            <p className="text-[16px] font-black text-tx">{ut.type}</p>
            <p className="text-[12px] text-mu font-medium mt-0.5 leading-snug">
              {ut.reason}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
