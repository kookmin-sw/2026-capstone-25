// 프로젝트 상세 페이지 — 진행률 카드 + 단계 목록 + 하단 액션(수정·삭제·목록으로).
// isEditing 모드에서는 StepEditor로 단계를 편집하고 저장 시 새 round decomposition을 생성한다.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Trash2 } from "lucide-react";
import ProgressCard from "../components/detail/ProgressCard";
import StepRow from "../components/detail/StepRow";
import StepEditor, { type EditableStep } from "../components/edit/StepEditor";
import { deleteProject, editSteps, getProject, listRounds, restoreRound, toggleStep, type ProjectDetail, type RoundInfo, type StepDetail } from "../services/projects";

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

  // 편집 모드 상태 — isEditing: true 시 StepEditor 표시
  const [isEditing, setIsEditing] = useState(false);
  const [editableSteps, setEditableSteps] = useState<EditableStep[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 버전 기록 상태
  const [showHistory, setShowHistory] = useState(false);
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [isLoadingRounds, setIsLoadingRounds] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

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

  // 편집 모드 진입 — 현재 단계를 EditableStep 형태로 복사
  function handleEditStart() {
    if (!project) return;
    setEditableSteps(
      project.steps.map((s) => ({ id: s.id, tempId: s.id, title: s.title })),
    );
    setIsEditing(true);
  }

  // 편집 취소 — 원래 상태로 복원
  function handleEditCancel() {
    setIsEditing(false);
    setEditableSteps([]);
  }

  // 편집 저장 — 빈 제목 검사 후 PATCH 호출, 성공 시 최신 데이터 재조회
  async function handleEditSave() {
    if (!project || !id) return;
    if (editableSteps.some((s) => !s.title.trim())) {
      alert("단계 제목을 모두 입력해 주세요.");
      return;
    }
    setIsSaving(true);
    try {
      await editSteps(id, editableSteps.map((s) => ({ id: s.id, title: s.title.trim() })));
      const updated = await getProject(id);
      setProject(updated);
      setIsEditing(false);
      setEditableSteps([]);
    } catch {
      alert("저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  // 버전 기록 토글 — 처음 열 때만 API 조회
  async function handleToggleHistory() {
    if (!id) return;
    if (!showHistory && rounds.length === 0) {
      setIsLoadingRounds(true);
      try {
        const data = await listRounds(id);
        setRounds(data);
      } catch {
        alert("버전 목록을 불러오지 못했어요.");
        return;
      } finally {
        setIsLoadingRounds(false);
      }
    }
    setShowHistory((prev) => !prev);
  }

  // 특정 버전 복원 — 성공 시 프로젝트 재조회
  async function handleRestore(round: number) {
    if (!id) return;
    const ok = window.confirm(`버전 ${round}로 복원할까요? 현재 단계 목록은 새 버전으로 대체됩니다.`);
    if (!ok) return;
    setIsRestoring(true);
    try {
      await restoreRound(id, round);
      const updated = await getProject(id);
      setProject(updated);
      setShowHistory(false);
      setRounds([]);
    } catch {
      alert("복원하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsRestoring(false);
    }
  }

  // trigger 한국어 변환
  function triggerLabel(trigger: string): string {
    if (trigger === "initial") return "최초 생성";
    if (trigger === "edit") return "직접 편집";
    if (trigger === "restore") return "버전 복원";
    return trigger;
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

      {/* ── 단계 목록 / 편집기 ── */}
      <div>
        <p className="text-xs font-bold text-mu mb-3 px-1">
          {isEditing ? "단계 편집" : "단계별 진행 상황"}
        </p>
        {isEditing ? (
          <StepEditor steps={editableSteps} onChange={setEditableSteps} busy={isSaving} />
        ) : (
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
        )}
      </div>

      {/* ── 하단 액션 ── */}
      {isEditing ? (
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleEditCancel}
            disabled={isSaving}
            className="flex-1 rounded-xl border border-bd bg-sf px-4 py-3 text-sm font-black text-mu text-center hover:bg-fa transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleEditSave()}
            disabled={isSaving}
            className="flex-1 rounded-xl bg-ac text-white px-4 py-3 text-sm font-black text-center disabled:opacity-60"
          >
            {isSaving ? "저장 중…" : "저장하기"}
          </button>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2.5 items-center pt-2">
          <button
            type="button"
            onClick={handleEditStart}
            className="rounded-xl border border-bd bg-sf px-4 py-3 text-sm font-black text-tx text-center hover:bg-fa transition-colors cursor-pointer"
          >
            수정하기
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="w-11 h-11 border border-bd rounded-xl bg-sf text-red-500 flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer"
            aria-label="프로젝트 삭제"
          >
            <Trash2 size={18} />
          </button>
          <button
            type="button"
            onClick={() => navigate("/all")}
            className="rounded-xl border border-bd bg-sf px-4 py-3 text-sm font-black text-tx text-center hover:bg-fa transition-colors cursor-pointer"
          >
            목록으로
          </button>
        </div>

        {/* 버전 기록 토글 버튼 */}
        <button
          type="button"
          onClick={() => void handleToggleHistory()}
          disabled={isLoadingRounds || isRestoring}
          className="w-full text-center text-xs font-bold text-mu py-1.5 hover:text-tx transition-colors cursor-pointer disabled:opacity-50"
        >
          {isLoadingRounds ? "불러오는 중…" : showHistory ? "▲ 버전 기록 닫기" : "🕐 버전 기록"}
        </button>

        {/* 버전 기록 패널 */}
        {showHistory && (
          <div className="bg-fa border border-bd2 rounded-2xl px-4 py-3 space-y-2">
            {rounds.length <= 1 ? (
              <p className="text-xs text-mu text-center py-2">이전 버전이 없어요.</p>
            ) : (
              rounds.map((r, i) => (
                <div key={r.decompositionId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-tx">
                      버전 {r.round}
                      {i === 0 && <span className="ml-1.5 text-ac font-black">현재</span>}
                    </p>
                    <p className="text-[11px] text-mu">
                      {triggerLabel(r.trigger)} · {r.stepCount}단계 · {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  {i !== 0 && (
                    <button
                      type="button"
                      onClick={() => void handleRestore(r.round)}
                      disabled={isRestoring}
                      className="shrink-0 text-xs font-black text-ac border border-ac rounded-lg px-2.5 py-1 hover:bg-ac-s transition-colors cursor-pointer disabled:opacity-50"
                    >
                      복원
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        </>
      )}
    </div>
  );
}
