// 프로젝트 상세 페이지 — 진행률 카드 + 단계 목록 + 하단 액션(수정·삭제·목록으로).
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Trash2 } from "lucide-react";
import ProgressCard from "../components/detail/ProgressCard";
import StepRow from "../components/detail/StepRow";
import { deleteProject, getProject, toggleStep, type ProjectDetail, type StepDetail } from "../services/projects";

// YYYY-MM-DD → D-day 문자열 계산
function getDdayText(due: string | null): string {
  if (!due) return "";
  const today = new Date();
  const dueDate = new Date(`${due}T00:00:00`);
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.ceil((dueDate.getTime() - todayDate.getTime()) / 86_400_000);
  if (diff === 0) return "D-Day";
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

// steps 배열로 진행률을 재계산한다
function calcProgress(steps: StepDetail[]) {
  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  return {
    doneCount: done,
    totalCount: total,
    progress: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setStatus("loading");
    getProject(id)
      .then((data) => { setProject(data); setStatus("ready"); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "불러오지 못했어요.");
        setStatus("error");
      });
  }, [id]);

  // 단계 완료 토글 — 낙관적 UI: 클릭 즉시 로컬 상태를 바꾸고 PATCH를 백그라운드로 보낸다.
  // 실패하면 원래 상태로 되돌린다.
  async function handleToggle(stepId: string, done: boolean) {
    if (!project) return;

    const prevSteps = project.steps;
    const nextSteps = prevSteps.map((s) => s.id === stepId ? { ...s, done } : s);

    setProject({ ...project, ...calcProgress(nextSteps), steps: nextSteps });

    try {
      await toggleStep(stepId, done);
    } catch {
      // 실패 시 롤백
      setProject({ ...project, steps: prevSteps });
    }
  }

  async function handleDelete() {
    if (!project) return;
    const ok = window.confirm("이 프로젝트를 삭제할까요?");
    if (!ok) return;
    await deleteProject(project.id);
    navigate("/all", { replace: true });
  }

  if (status === "loading") {
    return (
      <div className="px-4 py-16 text-center text-sm font-bold text-mu">
        불러오는 중이에요
      </div>
    );
  }

  if (status === "error" || !project) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-lg font-black text-tx">불러오지 못했어요</p>
        <p className="mt-2 text-sm text-mu">{error}</p>
        <button
          type="button"
          onClick={() => navigate("/all")}
          className="mt-5 rounded-full bg-tx text-white px-4 py-2 text-sm font-black"
        >
          목록으로
        </button>
      </div>
    );
  }

  // 다음 단계 = 완료되지 않은 첫 번째 단계
  const nextStepId = project.steps.find((s) => !s.done)?.id ?? null;
  const ddayText = getDdayText(project.due);

  return (
    <div className="px-4 lg:px-8 py-6 max-w-[720px] mx-auto w-full space-y-4">
      {/* ── 헤더 — 뒤로가기 + 프로젝트명 + D-Day ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/all")}
          className="bg-sf border border-bd rounded-xl p-2.5 text-tx shadow-sm shrink-0"
          aria-label="목록으로"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-tx leading-snug break-keep">{project.title}</h1>
          {(project.due || ddayText) && (
            <p className="text-xs text-mu mt-0.5">
              {project.due} {ddayText && <span className="font-bold">{ddayText}</span>}
            </p>
          )}
        </div>
      </div>

      {/* ── 진행률 카드 ── */}
      <ProgressCard
        progress={project.progress}
        doneCount={project.doneCount}
        totalCount={project.totalCount}
        color={project.color}
      />

      {/* ── 단계 목록 ── */}
      <div>
        <p className="text-xs font-bold text-mu mb-3 px-1">단계별 진행 상황</p>
        <div className="space-y-2.5">
          {project.steps.map((step, i) => (
            <StepRow
              key={step.id}
              step={step}
              index={i}
              isNext={step.id === nextStepId}
              color={project.color}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </div>

      {/* ── 하단 액션 — 수정 · 삭제 · 목록으로 ── */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2.5 items-center pt-2">
        {/* 수정하기 — R4(결과 4블록) 완성 후 연결 예정 */}
        <button
          type="button"
          disabled
          className="rounded-xl border border-bd bg-sf px-4 py-3 text-sm font-black text-mu text-center opacity-50"
        >
          수정하기
        </button>
        <button
          type="button"
          onClick={() => void handleDelete()}
          className="w-11 h-11 border border-bd rounded-xl bg-sf text-red-500 flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition-colors"
          aria-label="프로젝트 삭제"
        >
          <Trash2 size={18} />
        </button>
        <button
          type="button"
          onClick={() => navigate("/all")}
          className="rounded-xl border border-bd bg-sf px-4 py-3 text-sm font-black text-tx text-center hover:bg-fa transition-colors"
        >
          목록으로
        </button>
      </div>
    </div>
  );
}
