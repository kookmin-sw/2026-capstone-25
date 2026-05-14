import type { WeekData, ProjectReport } from "../../services/report";

function fmtTime(mins: number): string {
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

type Props = { weeks: WeekData[]; projects: ProjectReport[] };

export default function AutoComment({ weeks, projects }: Props) {
  const thisWeek = weeks[3] ?? { mins: 0, done: 0 };
  const lastWeek = weeks[2] ?? { mins: 0, done: 0 };
  const diffMins = thisWeek.mins - lastWeek.mins;
  const diffDone = thisWeek.done - lastWeek.done;

  const topProj = [...projects].sort((a, b) => b.timeSpent - a.timeSpent)[0];
  const stalledProj = projects.find((p) => p.timeSpent < 10 && p.totalCount > 0 && p.id !== topProj?.id);

  const isGrowing = diffMins > 0 && diffDone > 0;
  const isSlowing = diffMins < 0 || diffDone < 0;
  const headline = isGrowing
    ? "흐름이 붙고 있어요"
    : isSlowing
    ? "이번 주는 조금 쉬어갔어요"
    : "꾸준히 나아가고 있어요";

  const goods: string[] = [];
  const bads: string[] = [];
  if (topProj && topProj.doneCount > 0)
    goods.push(`${topProj.title}에서 ${topProj.doneCount}개를 끝냈어요`);
  if (diffMins > 0) goods.push(`지난주보다 ${fmtTime(diffMins)} 더 집중했어요`);
  if (diffDone > 0) goods.push(`완료한 단계가 ${diffDone}개 늘었어요`);
  if (stalledProj) bads.push(`${stalledProj.title}은 거의 손을 못 댔어요`);
  if (diffMins < 0) bads.push(`집중 시간이 지난주보다 ${fmtTime(Math.abs(diffMins))} 줄었어요`);
  if (goods.length === 0) goods.push("첫 발걸음을 뗐어요");
  if (bads.length === 0) bads.push("딱히 아쉬운 점이 없어요 👍");

  return (
    <div
      className="rounded-[20px] px-[22px] py-5"
      style={{ background: "var(--color-ac-grad)" }}
    >
      <p className="text-[11px] font-bold text-white/70 tracking-[0.5px] mb-1.5">
        이번 주 리포트
      </p>
      <p className="text-[21px] font-black text-white leading-snug mb-4">{headline}</p>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white/20 rounded-xl px-3.5 py-3">
          <p className="text-[11px] font-black text-white/90 mb-2 tracking-[0.2px]">잘한 점 ✓</p>
          <div className="flex flex-col gap-1.5">
            {goods.slice(0, 2).map((g, i) => (
              <p key={i} className="text-[12px] text-white/90 font-medium leading-snug">{g}</p>
            ))}
          </div>
        </div>
        <div className="bg-black/10 rounded-xl px-3.5 py-3">
          <p className="text-[11px] font-black text-white/90 mb-2 tracking-[0.2px]">아쉬운 점 ·</p>
          <div className="flex flex-col gap-1.5">
            {bads.slice(0, 2).map((b, i) => (
              <p key={i} className="text-[12px] text-white/85 font-medium leading-snug">{b}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
