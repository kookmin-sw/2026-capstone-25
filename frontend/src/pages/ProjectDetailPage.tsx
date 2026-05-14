// 프로젝트 상세 페이지 — 진행률 카드 + 단계 목록 + 하단 액션(수정·삭제·목록으로).
// isEditing 모드에서는 StepEditor로 단계를 편집하고 저장 시 새 round decomposition을 생성한다.
// 2차 분해: 1차 단계의 "2단계 쪼개기" → decomposeSub → saveSubSteps → 재조회.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Trash2 } from "lucide-react";
import ProgressCard from "../components/detail/ProgressCard";
import StepRow from "../components/detail/StepRow";
import StepEditor, { type EditableStep } from "../components/edit/StepEditor";
import {
  deleteProject,
  deleteSubSteps,
  editSteps,
  getProject,
  listRounds,
  restoreRound,
  saveSubSteps,
  toggleStep,
  type CreateStepInput,
  type EditStepInput,
  type ProjectDetail,
  type RoundInfo,
  type StepDetail,
} from "../services/projects";
import { decomposeSub } from "../services/decompose";

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

// steps 배열로 진행률을 재계산한다. 1차 단계(부모 없음)만 카운트한다.
function calcProgress(steps: StepDetail[]) {
  const topLevel = steps.filter((s) => s.parentStepId === null);
  const total = topLevel.length;
  const done = topLevel.filter((s) => s.done).length;
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

  // 2차 분해 호출 중인 부모 step id — 해당 카드의 "2단계 쪼개기" 버튼만 비활성
  const [busySubParentId, setBusySubParentId] = useState<string | null>(null);

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
  // 자식 단계 토글 시 형제 상태로 부모 done을 재계산해 같이 동기화한다 (§10.3.5).
  async function handleToggle(stepId: string, done: boolean) {
    if (!project) return;

    const prevSteps = project.steps;
    const toggled = prevSteps.find((s) => s.id === stepId);
    if (!toggled) return;

    let nextSteps = prevSteps.map((s) => s.id === stepId ? { ...s, done } : s);

    // 자식 단계라면 형제 done 비율로 부모 done을 결정한다.
    // 자식 모두 done → 부모 done=true, 하나라도 미완료 → 부모 done=false
    let parentSyncId: string | null = null;
    let parentSyncDone = false;
    if (toggled.parentStepId) {
      const siblings = nextSteps.filter((s) => s.parentStepId === toggled.parentStepId);
      const allDone = siblings.every((s) => s.done);
      const parent = nextSteps.find((s) => s.id === toggled.parentStepId);
      if (parent && parent.done !== allDone) {
        parentSyncId = parent.id;
        parentSyncDone = allDone;
        nextSteps = nextSteps.map((s) => s.id === parentSyncId ? { ...s, done: allDone } : s);
      }
    }

    setProject({ ...project, ...calcProgress(nextSteps), steps: nextSteps });

    try {
      await toggleStep(stepId, done);
      if (parentSyncId) {
        await toggleStep(parentSyncId, parentSyncDone);
      }
    } catch {
      // 실패 시 롤백
      setProject({ ...project, steps: prevSteps });
    }
  }

  // 2차 분해 — 부모 단계 하나를 AI로 다시 쪼개서 DB에 누적 저장한다.
  async function handleSubDecompose(parent: StepDetail) {
    if (!project || !id || busySubParentId) return;
    setBusySubParentId(parent.id);
    try {
      const aiResponse = await decomposeSub({
        parentStepId: parent.id,
        parentStepTitle: parent.title,
        parentStepDescription: parent.description ?? "",
        parentGoal: project.title,
      });

      // AI 응답 → CreateStepInput[] 매핑. parent_step_id는 백엔드가 무시한다(parentStepId 본문에서 받음).
      const stepsToSave: CreateStepInput[] = aiResponse.result.steps.map((s) => ({
        title: s.title,
        description: s.description || undefined,
        guide: s.guide || undefined,
        firstMove: s.first_move || undefined,
        unblocker: s.unblocker || undefined,
        estimatedMinutes: s.estimated_minutes > 0 ? s.estimated_minutes : undefined,
        boundarySignal: s.boundary_signal || undefined,
      }));

      await saveSubSteps(id, parent.id, stepsToSave);
      const updated = await getProject(id);
      setProject(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "2단계 쪼개기에 실패했어요.");
    } finally {
      setBusySubParentId(null);
    }
  }

  // "세부 단계 수정" — 전체 단계 인라인 편집 모드 진입(§10.3.3 표 ② "세부 단계 수정").
  // 결과 화면과 동일하게 1·2차를 들여쓰기로 펼쳐 편집한다.
  function handleEditSubSteps(_parent: StepDetail) {
    handleEditStart();
  }

  // 특정 부모 단계의 하위 단계 전체 폐기 — SubStepBox의 "전체 취소" 버튼이 호출.
  // 낙관적 UI: 화면에서 즉시 자식 제거 후 DELETE. 실패 시 재조회로 복구.
  async function handleCancelSubSteps(parent: StepDetail) {
    if (!project || !id) return;
    const prevSteps = project.steps;
    const nextSteps = prevSteps.filter((s) => s.parentStepId !== parent.id);
    setProject({ ...project, ...calcProgress(nextSteps), steps: nextSteps });

    try {
      await deleteSubSteps(id, parent.id);
    } catch {
      // 실패 시 서버 상태로 복구
      try {
        const updated = await getProject(id);
        setProject(updated);
      } catch {
        // 재조회도 실패하면 직전 state로 롤백
        setProject({ ...project, steps: prevSteps });
      }
    }
  }

  // 편집 모드 진입 — 1·2차 트리를 EditableStep 트리로 복사(결과 화면과 동일한 시그니처).
  function handleEditStart() {
    if (!project) return;
    const childrenByParent = new Map<string, StepDetail[]>();
    for (const s of project.steps) {
      if (!s.parentStepId) continue;
      const list = childrenByParent.get(s.parentStepId) ?? [];
      list.push(s);
      childrenByParent.set(s.parentStepId, list);
    }
    setEditableSteps(
      project.steps
        .filter((s) => s.parentStepId === null)
        .map((s) => ({
          id: s.id,
          tempId: s.id,
          title: s.title,
          children: (childrenByParent.get(s.id) ?? []).map((c) => ({
            id: c.id,
            tempId: c.id,
            title: c.title,
          })),
        })),
    );
    setIsEditing(true);
  }

  // 편집 취소 — 원래 상태로 복원
  function handleEditCancel() {
    setIsEditing(false);
    setEditableSteps([]);
  }

  // 편집 저장 — 빈 제목(자식 포함) 검사 후 PATCH 호출, 성공 시 최신 데이터 재조회.
  // 트리(1차 + children) 그대로 백엔드에 전달 — 새 round decomposition에 부모·자식 모두 새로 insert.
  async function handleEditSave() {
    if (!project || !id) return;
    const emptyTitle = editableSteps.some(
      (s) => !s.title.trim() || (s.children ?? []).some((c) => !c.title.trim()),
    );
    if (emptyTitle) {
      alert("단계 제목을 모두 입력해 주세요.");
      return;
    }
    setIsSaving(true);
    try {
      const payload: EditStepInput[] = editableSteps.map((s) => {
        const kids = s.children ?? [];
        const base: EditStepInput = { id: s.id, title: s.title.trim() };
        return kids.length > 0
          ? { ...base, children: kids.map((c) => ({ id: c.id, title: c.title.trim() })) }
          : base;
      });
      await editSteps(id, payload);
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

  // 1차 단계 = parentStepId가 없는 단계. 자식 단계는 parent_step_id로 묶어 SubStepBox에 전달.
  const topLevelSteps = project.steps.filter((s) => s.parentStepId === null);
  const childrenByParent = new Map<string, StepDetail[]>();
  for (const s of project.steps) {
    if (!s.parentStepId) continue;
    const list = childrenByParent.get(s.parentStepId) ?? [];
    list.push(s);
    childrenByParent.set(s.parentStepId, list);
  }

  // 다음 단계 = 1차 단계 중 미완료 첫 번째
  const nextStepId = topLevelSteps.find((s) => !s.done)?.id ?? null;
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
            {topLevelSteps.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                index={i}
                isNext={step.id === nextStepId}
                color={project.color}
                subSteps={childrenByParent.get(step.id) ?? []}
                busySubDecompose={busySubParentId === step.id}
                onToggle={handleToggle}
                onSubDecompose={handleSubDecompose}
                onEditSubSteps={handleEditSubSteps}
                onCancelSubSteps={handleCancelSubSteps}
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
