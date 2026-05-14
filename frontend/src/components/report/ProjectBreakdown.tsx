import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ProjectReport } from "../../services/report";

function fmtTime(mins: number): string {
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

type Props = { projects: ProjectReport[] };

export default function ProjectBreakdown({ projects }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const maxTime = Math.max(...projects.map((p) => p.timeSpent), 1);
  const sorted = [...projects].sort((a, b) => b.timeSpent - a.timeSpent);

  if (sorted.length === 0) {
    return (
      <div className="bg-sf border border-bd2 rounded-[20px] p-[18px]">
        <p className="text-[13px] font-black text-tx mb-4">프로젝트별 집중 시간</p>
        <p className="text-sm text-mu text-center py-4">아직 집중 기록이 없어요</p>
      </div>
    );
  }

  return (
    <div className="bg-sf border border-bd2 rounded-[20px] shadow-[0_2px_6px_rgba(180,110,70,0.06)] p-[18px]">
      <p className="text-[13px] font-black text-tx mb-4">프로젝트별 집중 시간</p>
      <div className="flex flex-col gap-3.5">
        {sorted.map((p) => {
          const barW = Math.max(4, Math.round((p.timeSpent / maxTime) * 100));
          const isOpen = openId === p.id;
          return (
            <div key={p.id}>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setOpenId(isOpen ? null : p.id)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[12px] font-bold text-tx overflow-hidden text-ellipsis whitespace-nowrap max-w-[65%]"
                  >
                    {p.title}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-mu font-semibold">
                      {p.timeSpent > 0 ? fmtTime(p.timeSpent) : "-"}
                    </span>
                    <ChevronDown
                      size={14}
                      className="text-mu transition-transform"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </div>
                </div>
                {/* 진행 바 */}
                <div className="h-[5px] bg-fa rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${barW}%`,
                      background: p.color ?? "var(--color-ac)",
                    }}
                  />
                </div>
                {/* 마감 페이스 */}
                {p.pacePrediction && (
                  <p className="text-[10.5px] text-mu font-semibold mt-1.5 text-left">
                    {p.pacePrediction}
                  </p>
                )}
              </button>

              {/* 아코디언 — 완료율 */}
              {isOpen && (
                <div
                  className="mt-2 pl-2.5 flex flex-col gap-0"
                  style={{ borderLeft: `2px solid ${p.color ?? "var(--color-ac)"}44` }}
                >
                  <div className="flex items-center justify-between py-1.5 border-b border-bd2">
                    <span className="text-[12px] text-mu font-semibold">완료</span>
                    <span className="text-[12px] font-bold text-tx">{p.doneCount}개</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-bd2">
                    <span className="text-[12px] text-mu font-semibold">전체</span>
                    <span className="text-[12px] font-bold text-tx">{p.totalCount}개</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[12px] text-mu font-semibold">진행률</span>
                    <span className="text-[12px] font-bold text-tx">{p.progress}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
