// 프로젝트 상세 상단의 진행률 카드. % 바 + 완료/전체 숫자를 보여준다.
type Props = {
  progress: number;
  doneCount: number;
  totalCount: number;
  color: string | null;
};

export default function ProgressCard({ progress, doneCount, totalCount, color }: Props) {
  const accentColor = color ?? "var(--color-ac)";

  return (
    <div className="bg-sf border border-bd2 rounded-2xl px-4 py-4 shadow-sm flex items-center gap-4">
      <div className="flex-1">
        <div className="flex justify-between mb-2">
          <span className="text-xs font-bold text-mu">진행률</span>
          <span className="text-sm font-black" style={{ color: accentColor }}>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-fa overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>
      <div className="text-2xl font-black text-tx leading-none">
        {doneCount}
        <span className="text-sm font-medium text-mu">/{totalCount}</span>
      </div>
    </div>
  );
}
