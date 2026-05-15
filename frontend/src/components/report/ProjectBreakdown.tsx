import { useState } from "react";
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

  // 집중 기록 없는 프로젝트 제외
  const active = [...projects]
    .filter((p) => p.timeSpent > 0)
    .sort((a, b) => b.timeSpent - a.timeSpent);

  const maxTime = Math.max(...active.map((p) => p.timeSpent), 1);

  if (active.length === 0) {
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
        {active.map((p) => {
          const barW = Math.round((p.timeSpent / maxTime) * 100);
          const isOpen = openId === p.id;
          const accent = p.color ?? "var(--color-ac)";
          const remaining = p.totalCount - p.doneCount;

          return (
            <div key={p.id}>
              {/* 프로젝트 행 */}
              <div className="flex items-center gap-[10px] mb-[7px]">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-[5px]">
                    <span className="text-[12px] font-bold text-tx overflow-hidden text-ellipsis whitespace-nowrap max-w-[65%]">
                      {p.title}
                    </span>
                    <span className="text-[11px] text-mu font-semibold shrink-0">
                      {fmtTime(p.timeSpent)}
                    </span>
                  </div>
                  <div className="h-[5px] bg-fa rounded-[3px] overflow-hidden">
                    <div
                      className="h-full rounded-[3px]"
                      style={{ width: `${barW}%`, background: accent }}
                    />
                  </div>
                </div>
              </div>

              {/* 아코디언 토글 */}
              {p.totalCount > 0 && (
                <div className="pl-[18px]">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : p.id)}
                    className="flex items-center gap-1 cursor-pointer"
                  >
                    <span className="text-[11px] font-bold text-mu">
                      완료 {p.doneCount}개{remaining > 0 && ` · 진행 중 ${remaining}개`}
                    </span>
                    <svg
                      width="12" height="12" viewBox="0 0 12 12" fill="none"
                      style={{ transition: "transform .2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", color: "var(--color-mu)" }}
                    >
                      <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div
                      className="flex items-center gap-4 mt-[6px] px-[10px] py-[8px] rounded-[10px]"
                      style={{ borderLeft: `2px solid ${accent}28`, background: `${accent}08` }}
                    >
                      <div className="text-center">
                        <p className="text-[15px] font-black text-tx">{p.doneCount}</p>
                        <p className="text-[10px] text-mu font-semibold">완료</p>
                      </div>
                      <div className="w-px h-6 bg-bd2" />
                      <div className="text-center">
                        <p className="text-[15px] font-black text-tx">{p.totalCount}</p>
                        <p className="text-[10px] text-mu font-semibold">전체</p>
                      </div>
                      <div className="w-px h-6 bg-bd2" />
                      <div className="text-center">
                        <p className="text-[15px] font-black text-tx">{p.progress}%</p>
                        <p className="text-[10px] text-mu font-semibold">진행률</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
