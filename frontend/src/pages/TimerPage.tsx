// 타이머 페이지 — 시간 설정(timepick)과 카운트다운(timer) 두 모드를 하나의 페이지에서 처리한다.
// 완료 or 종료 시 time_spent를 백엔드에 누적하고 /all로 이동한다.
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import CountdownRing from "../components/timer/CountdownRing";
import { postTimeSpent } from "../services/timer";

type Mode = "timepick" | "timer" | "complete";

// 빠른 선택 칩 목록 (분) — 덜 애매한 단위로 구성
const QUICK_CHIPS = [15, 30, 45, 60];

export default function TimerPage() {
  const { stepId } = useParams<{ stepId: string }>();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("timepick");
  const [totalMin, setTotalMin] = useState(30);

  // 카운트다운 상태
  const [totalSec, setTotalSec] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isOn, setIsOn] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 타이머 인터벌 관리
  useEffect(() => {
    if (!isOn || isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setElapsedSec((prev) => {
        if (prev + 1 >= totalSec) {
          clearInterval(intervalRef.current!);
          handleEnd(totalSec);
          return totalSec;
        }
        return prev + 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isOn, isPaused, totalSec]);

  const [spentMin, setSpentMin] = useState(0);

  // 타이머 종료 처리 — 경과 시간을 백엔드에 저장하고 완료 화면으로 이동.
  // 60초 미만은 저장하지 않는다 (1초 실행해도 1분으로 올라가는 문제 방지).
  async function handleEnd(elapsed: number) {
    setIsOn(false);
    const mins = Math.floor(elapsed / 60);
    if (stepId && mins >= 1) {
      try { await postTimeSpent(stepId, mins); } catch { /* 실패해도 화면은 이동 */ }
    }
    setSpentMin(mins);
    setMode("complete");
  }

  // 집중 시작
  function startTimer() {
    const sec = totalMin * 60;
    setTotalSec(sec);
    setElapsedSec(0);
    setIsOn(true);
    setIsPaused(false);
    setMode("timer");
  }

  // 종료 버튼 — 1분 미만이면 저장 없이 /all 이동
  async function handleStop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsOn(false);
    await handleEnd(elapsedSec);
  }

  // ── 완료 화면 ──
  if (mode === "complete") {
    return (
      <main className="min-h-screen text-tx flex flex-col items-center justify-center px-[18px]">
        <div className="w-full max-w-[480px] flex flex-col items-center gap-6 text-center">
          <div className="text-6xl">🎉</div>
          <div>
            <h1 className="text-2xl font-black text-tx mb-2">한 단계 마무리!</h1>
            {spentMin >= 1 && (
              <p className="text-sm text-mu">{spentMin}분 집중했어요</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate("/all")}
            className="w-full rounded-xl bg-ac text-white py-4 text-sm font-black cursor-pointer hover:opacity-90 transition-opacity"
          >
            돌아가기
          </button>
        </div>
      </main>
    );
  }

  // ── 시간 설정 화면 ──
  if (mode === "timepick") {
    return (
      <main className="min-h-screen text-tx flex flex-col items-center px-[18px] py-10">
        <div className="w-full max-w-[480px] flex flex-col flex-1 items-center">
        {/* 뒤로가기 */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="self-start bg-sf border border-bd rounded-xl p-2.5 text-tx shadow-sm mb-8 cursor-pointer"
          aria-label="뒤로가기"
        >
          <ChevronLeft size={16} />
        </button>

        <h1 className="text-2xl font-black text-tx mb-1">얼마나 집중할까요?</h1>
        <p className="text-sm text-mu mb-8">30분 집중하면 한 발짝 나아가요</p>

        {/* 분 수 표시 */}
        <div className="flex items-baseline gap-1 mb-6">
          <span
            className="font-black text-tx leading-none"
            style={{ fontSize: "80px", letterSpacing: "-4px", fontVariantNumeric: "tabular-nums" }}
          >
            {totalMin}
          </span>
          <span className="text-2xl font-bold text-mu">분</span>
        </div>

        {/* 슬라이더 — 채워진 부분은 오렌지, 남은 부분은 크림색으로 표시 */}
        <input
          type="range"
          min={1}
          max={60}
          value={totalMin}
          onChange={(e) => setTotalMin(Number(e.target.value))}
          className="timer-slider mb-1 cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--color-ac) ${((totalMin - 1) / 59) * 100}%, var(--color-bd) ${((totalMin - 1) / 59) * 100}%)`,
          }}
        />
        <div className="w-full flex justify-between text-[11px] font-bold text-mu mb-6">
          <span>1분</span><span>60분</span>
        </div>

        {/* 빠른 선택 칩 */}
        <div className="flex gap-2 flex-wrap mb-auto">
          {QUICK_CHIPS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTotalMin(n)}
              className={[
                "px-[18px] py-[10px] rounded-xl border text-sm font-black cursor-pointer",
                totalMin === n
                  ? "border-ac bg-ac-s text-ac-d"
                  : "border-bd bg-sf text-tx2",
              ].join(" ")}
            >
              {n}분
            </button>
          ))}
        </div>

        {/* 시작 버튼 */}
        <div className="w-full mt-10 flex flex-col gap-3">
          <button
            type="button"
            onClick={startTimer}
            className="w-full rounded-xl bg-ac text-white py-4 text-sm font-black cursor-pointer shadow-[0_4px_14px_rgba(255,107,61,0.35)] hover:opacity-90 transition-opacity"
          >
            집중 시작하기
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full rounded-xl border border-bd bg-sf text-tx2 py-3.5 text-sm font-bold cursor-pointer hover:bg-fa transition-colors"
          >
            돌아가기
          </button>
        </div>
        </div>
      </main>
    );
  }

  // ── 카운트다운 화면 ──
  return (
    <main className="min-h-screen text-tx flex flex-col items-center justify-between px-[18px] py-10">
      <div className="w-full max-w-[480px] flex flex-col flex-1 justify-between items-center">
        <button
          type="button"
          onClick={() => { setMode("timepick"); setIsOn(false); if (intervalRef.current) clearInterval(intervalRef.current); }}
          className="self-start bg-sf border border-bd rounded-xl p-2.5 text-tx shadow-sm cursor-pointer"
          aria-label="설정으로"
        >
          <ChevronLeft size={16} />
        </button>

        <CountdownRing totalSec={totalSec} elapsedSec={elapsedSec} isPaused={isPaused} />

        {/* 제어 버튼 */}
        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="w-full rounded-xl bg-ac-s border border-ac text-ac-d py-4 text-sm font-black cursor-pointer"
          >
            {isPaused ? "▶ 계속하기" : "⏸ 일시정지"}
          </button>
          <button
            type="button"
            onClick={() => void handleStop()}
            className="w-full rounded-xl bg-sf border border-bd text-mu py-3.5 text-sm font-black cursor-pointer"
          >
            ■ 종료하기
          </button>
        </div>
      </div>
    </main>
  );
}
