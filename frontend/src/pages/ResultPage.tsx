import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { decompose, decomposeSub } from "../services/decompose";
import { createProject, type CreateProjectInput, type CreateStepInput } from "../services/projects";
import type {
  ConfirmActionId,
  DecomposeApiResponse,
  DecomposeRequest,
  RefineMode,
  Step,
} from "../schemas/decompose";
import ResultBlock from "../components/result/ResultBlock";
import ReasoningBlock from "../components/result/ReasoningBlock";
import RefineBlock, { type HistoryPreview } from "../components/result/RefineBlock";
import ConfirmBlock from "../components/result/ConfirmBlock";
import StepEditor, { type EditableStep } from "../components/edit/StepEditor";

// 결과 화면 진입 시 location.state 로 전달되는 입력. HomePage 의 navigate 와 모양을 맞춘다.
type LocationState = { input?: DecomposeRequest };

const MAX_HISTORY = 3;

// ── sessionStorage 캐시 ──
// "F5 = 직전 상태 복구" 정책. 같은 입력으로 결과 화면을 다시 들어오면 AI를 재호출하지 않고 직전 결과를 복구한다.
// 폐기는 (1) 확정하기 성공, (2) 홈에서 새 입력으로 fingerprint 불일치 시 자동.
// 다시 굴리기는 RefineBlock 칩(더 잘게/더 크게/AI에게 직접 얘기)이 담당.
const STORAGE_KEY = "hanbaljjak:result-cache";

type CacheShape = {
  fingerprint: string;
  input: DecomposeRequest;
  data: DecomposeApiResponse;
  history: DecomposeApiResponse[];
  isEditing: boolean;
  editableSteps: EditableStep[];
};

function fingerprint(input: DecomposeRequest): string {
  return JSON.stringify({
    t: input.title,
    m: input.memo ?? "",
    s: input.startDate ?? "",
    d: input.dueDate ?? "",
    h: input.templateHint ?? "",
  });
}

function readCache(): CacheShape | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheShape;
  } catch {
    return null;
  }
}

function writeCache(cache: CacheShape): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // 용량 초과 등 — 캐시 실패는 조용히 무시 (기능 동작에는 영향 없음)
  }
}

function clearCache(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시
  }
}

// 마운트 시 캐시 복구 가능 여부 판정 — fingerprint가 일치할 때만 hydrate 한다.
function getHydratedCache(initialInput: DecomposeRequest | undefined): CacheShape | null {
  if (!initialInput) return null;
  const cache = readCache();
  if (!cache) return null;
  if (cache.fingerprint !== fingerprint(initialInput)) return null;
  return cache;
}

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialInput = (location.state as LocationState | null)?.input;

  // 마운트 시점 1회만 캐시를 읽어 초기 state를 채운다.
  // useState의 lazy initializer를 쓰면 4번 호출돼도 sessionStorage 접근은 첫 호출만 의미가 있지만,
  // 명시적으로 한 번만 읽기 위해 별도 변수에 담는다.
  const [hydratedCache] = useState(() => getHydratedCache(initialInput));

  const [input, setInput] = useState<DecomposeRequest | null>(initialInput ?? null);
  const [data, setData] = useState<DecomposeApiResponse | null>(hydratedCache?.data ?? null);
  const [history, setHistory] = useState<DecomposeApiResponse[]>(hydratedCache?.history ?? []);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 인라인 편집 모드 — "직접 수정하기" 클릭 시 진입. 편집된 단계는 메모리에만 보관하고
  // "확정하기" 시점에 createProject 페이로드로 매핑한다.
  const [isEditing, setIsEditing] = useState(hydratedCache?.isEditing ?? false);
  const [editableSteps, setEditableSteps] = useState<EditableStep[]>(hydratedCache?.editableSteps ?? []);

  // 2차 분해 호출 중인 부모 step id — 해당 카드의 "하위 단계로 쪼개기" 버튼만 비활성화
  const [busySubParentId, setBusySubParentId] = useState<string | null>(null);

  // initialInput 이 없으면 입력 화면으로 돌려보낸다.
  useEffect(() => {
    if (!initialInput) navigate("/", { replace: true });
  }, [initialInput, navigate]);

  // 첫 호출 — useEffect 두 번 실행되는 dev StrictMode 환경에서도 한 번만 보내도록 가드.
  // 캐시에서 hydrate된 경우 data가 이미 있으므로 API 재호출을 건너뛴다.
  const firedRef = useRef(!!hydratedCache);
  useEffect(() => {
    if (!input || firedRef.current || data) return;
    firedRef.current = true;
    void runDecompose(input, { pushHistory: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input?.title]);

  // 캐시 writeBack — data/history/편집 상태가 바뀔 때마다 sessionStorage에 기록한다.
  // data가 없으면(첫 분해 진행 중 or 에러 상태) 캐시를 쓰지 않는다.
  useEffect(() => {
    if (!input || !data) return;
    writeCache({
      fingerprint: fingerprint(input),
      input,
      data,
      history,
      isEditing,
      editableSteps,
    });
  }, [input, data, history, isEditing, editableSteps]);

  async function runDecompose(
    next: DecomposeRequest,
    { pushHistory }: { pushHistory: boolean },
  ) {
    setBusy(true);
    setError(null);
    try {
      const fresh = await decompose(next);
      if (pushHistory && data) {
        setHistory((prev) => [...prev, data].slice(-MAX_HISTORY));
      }
      setData(fresh);
      setInput(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 분해 요청이 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  function onRefine(mode: RefineMode, feedback?: string) {
    if (!input) return;
    // 자식이 하나라도 있으면 사용자에게 확인 — 재분해는 1차만 다시 뽑으므로 기존 2차는 고아가 되어 폐기된다.
    const hasChildren = !!data?.result.steps.some((s) => s.parent_step_id !== null);
    if (hasChildren) {
      const ok = window.confirm(
        "다시 분해하면 직접 만들어둔 하위 단계가 모두 사라져요. 계속할까요?\n(돌리기로 이전 상태로 되돌릴 수 있어요)",
      );
      if (!ok) return;
    }

    const next: DecomposeRequest = { ...input, refineMode: mode };
    if (mode === "feedback") {
      // 피드백 모드만 직전 결과를 압축해서 같이 보낸다 — 사용자의 참조 표현("3번째 단계…") 해석 근거.
      next.refineFeedback = feedback?.trim() || undefined;
      const topLevel = (data?.result.steps ?? []).filter((s) => s.parent_step_id === null);
      if (topLevel.length > 0) {
        next.previousSteps = topLevel.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
        }));
      }
    } else {
      // smaller/larger는 이전 호출 잔여 필드를 묻혀 보내지 않도록 명시적으로 비운다.
      next.refineFeedback = undefined;
      next.previousSteps = undefined;
    }
    void runDecompose(next, { pushHistory: true });
  }

  // 드롭다운에서 특정 버전을 골라 복원 — 선택한 버전을 화면으로, 현재 결과를 히스토리 끝에 push.
  // 슬롯 상한 MAX_HISTORY 그대로 유지(앞에서 탈락).
  function onRestoreVersion(index: number) {
    setHistory((prev) => {
      if (index < 0 || index >= prev.length || !data) return prev;
      const target = prev[index];
      const remaining = prev.filter((_, i) => i !== index);
      setData(target);
      return [...remaining, data].slice(-MAX_HISTORY);
    });
  }

  // "돌리기" = 드롭다운에서 가장 최근 버전을 고른 것과 동일 — 현재 결과도 히스토리에 보존된다.
  // 두 경로의 정책을 일치시켜 "최근 N개 결과를 보관 중이에요" 안내의 약속을 지킨다.
  function onRevert() {
    if (history.length === 0) return;
    onRestoreVersion(history.length - 1);
  }

  // 2차 분해 — 결과 화면에서 leaf 부모 단계 하나를 쪼개 자식을 같은 steps[] 배열에 누적한다.
  // 저장 전이라 DB는 건드리지 않고 메모리에만 머무른다. "확정하기" 시점에 함께 createProject로 전송.
  async function handleSubDecompose(parent: Step) {
    if (!data || !input || busySubParentId) return;
    setBusySubParentId(parent.id);
    setError(null);
    try {
      const subRes = await decomposeSub({
        parentStepId: parent.id,
        parentStepTitle: parent.title,
        parentStepDescription: parent.description,
        parentGoal: data.result.analysis.goal?.trim() || input.title,
      });

      // 새 자식 단계만 메모리 트리에 누적 (백엔드가 parent_step_id를 강제 주입해서 반환한다).
      const newChildren = subRes.result.steps.filter((s) => s.parent_step_id === parent.id);

      // history push는 하지 않는다 — sub-decompose는 "돌리기" 슬롯을 소비하지 않는다.
      // 자식 제거는 카드의 "전체 취소" 버튼이 담당.
      setData({
        ...data,
        result: {
          ...data.result,
          // 같은 부모의 기존 자식은 제거 후 새 자식으로 교체 (재호출 시나리오).
          steps: [
            ...data.result.steps.filter((s) => s.parent_step_id !== parent.id),
            ...newChildren,
          ],
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "하위 단계로 쪼개기에 실패했어요.");
    } finally {
      setBusySubParentId(null);
    }
  }

  // 특정 부모 단계의 2차 분해 결과를 통째 폐기 — "하위 단계 N개 · 전체 취소" 버튼이 호출.
  function handleCancelSubSteps(parent: Step) {
    if (!data) return;
    setData({
      ...data,
      result: {
        ...data.result,
        steps: data.result.steps.filter((s) => s.parent_step_id !== parent.id),
      },
    });
  }

  async function onConfirmAction(id: ConfirmActionId) {
    if (id === "back") {
      navigate("/");
      return;
    }
    if (id === "save" || id === "save-single") {
      if (!input || !data || saving) return;
      setSaving(true);
      setError(null);
      try {
        const payload = buildCreateProjectInput(input, data, id === "save-single");
        await createProject(payload);
        clearCache();
        // replace: true — 뒤로가기로 /result에 돌아와 AI를 또 호출하거나 같은 제목으로 중복 저장하는 사고 방지
        navigate("/all", { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "프로젝트를 저장하지 못했어요.");
      } finally {
        setSaving(false);
      }
      return;
    }
    if (id === "edit") {
      if (!data) return;
      // 결과 화면 트리(1차 + 2차)를 EditableStep 트리로 복사.
      const childrenByParent = new Map<string, Step[]>();
      for (const s of data.result.steps) {
        if (!s.parent_step_id) continue;
        const list = childrenByParent.get(s.parent_step_id) ?? [];
        list.push(s);
        childrenByParent.set(s.parent_step_id, list);
      }
      const topLevel = data.result.steps.filter((s) => s.parent_step_id === null);
      setEditableSteps(
        topLevel.map((s) => ({
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
      setError(null);
      setIsEditing(true);
      return;
    }
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditableSteps([]);
    setError(null);
  }

  async function saveEdited() {
    if (!input || !data || saving) return;
    const emptyTitle = editableSteps.some(
      (s) => !s.title.trim() || (s.children ?? []).some((c) => !c.title.trim()),
    );
    if (emptyTitle) {
      setError("단계 제목을 모두 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildCreateProjectInput(input, data, false, editableSteps);
      await createProject(payload);
      clearCache();
      // replace: true — 뒤로가기로 /result에 돌아와 AI를 또 호출하거나 같은 제목으로 중복 저장하는 사고 방지
      navigate("/all", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "프로젝트를 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  if (!input) return null; // navigate("/") 가 진행 중인 짧은 순간

  if (!data && busy) {
    return <LoadingView />;
  }

  if (!data && error) {
    return (
      <ErrorView
        message={error}
        onRetry={() => {
          firedRef.current = false;
          void runDecompose(input, { pushHistory: false });
        }}
        onBack={() => navigate("/")}
      />
    );
  }

  if (!data) return null;

  if (isEditing) {
    return (
      <div className="px-[18px] py-6">
        {saving && <BusyBar text="프로젝트를 저장하는 중…" />}
        {error && (
          <div className="mb-3 text-[12.5px] text-rd bg-rd-s border border-rd-s rounded-[10px] px-3 py-2">
            {error}
          </div>
        )}

        <div className="mb-4">
          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-ac-d bg-ac-s rounded-full px-[10px] py-1 mb-[10px]">
            ✎ 단계를 직접 수정하고 있어요
          </div>
          <div className="text-[21px] font-extrabold text-tx leading-[1.3] mb-[14px]">
            {input.title}
          </div>
        </div>

        <StepEditor steps={editableSteps} onChange={setEditableSteps} busy={saving} />

        <div className="flex gap-2.5 pt-4">
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="flex-1 rounded-xl border border-bd bg-sf px-4 py-3 text-sm font-black text-mu text-center hover:bg-fa transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void saveEdited()}
            disabled={saving}
            className="flex-1 rounded-xl bg-ac text-white px-4 py-3 text-sm font-black text-center disabled:opacity-60"
          >
            {saving ? "저장 중…" : "확정하기"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-[18px] py-6">
      {(busy || saving) && (
        <BusyBar text={saving ? "프로젝트를 저장하는 중…" : "다시 분해하는 중…"} />
      )}
      {error && (
        <div className="mb-3 text-[12.5px] text-rd bg-rd-s border border-rd-s rounded-[10px] px-3 py-2">
          {error}
        </div>
      )}

      <ResultBlock
        projectTitle={input.title}
        data={data}
        busySubDecomposeParentId={busySubParentId}
        onSubDecompose={handleSubDecompose}
        onCancelSubSteps={handleCancelSubSteps}
      />
      <ReasoningBlock reasoning={data.reasoning} />
      <RefineBlock
        onRefine={onRefine}
        busy={busy || saving}
        history={buildHistoryPreviews(history)}
        onRevert={onRevert}
        onRestoreVersion={onRestoreVersion}
        hasSubSteps={data.result.steps.some((s) => s.parent_step_id !== null)}
      />
      <ConfirmBlock onAction={onConfirmAction} busy={busy || saving} />
    </div>
  );
}

// 분해 응답 + 입력을 백엔드 CreateProjectSchema 모양으로 매핑한다.
// estimated_minutes는 백엔드 positive int 검증 — 0/음수면 보내지 않는다(undefined).
// goal은 빈 문자열일 가능성에 대비해 입력 title을 fallback으로 둔다.
// editedSteps가 주어지면(편집 모드 저장) 그 트리 모양으로 단계를 구성한다.
// tempId가 원본 AI 단계 id와 일치하고 제목도 그대로면 AI 가이드를 보존, 신규/제목 변경 시 title만 보낸다.
function buildCreateProjectInput(
  req: DecomposeRequest,
  res: DecomposeApiResponse,
  isSingle: boolean,
  editedSteps?: EditableStep[],
): CreateProjectInput {
  const analysis = res.result.analysis;
  const meta = {
    title: req.title,
    memo: req.memo?.trim() || undefined,
    primaryType: analysis.primary_type || undefined,
    secondaryTags: analysis.secondary_tags ?? [],
    goal: analysis.goal?.trim() || req.title,
    currentPhase: analysis.current_position?.phase_label || undefined,
    startDate: req.startDate,
    due: req.dueDate,
  };

  if (isSingle) {
    return { ...meta, isSingle: true, steps: [] };
  }

  function fromAi(s: Step): CreateStepInput {
    return {
      title: s.title,
      description: s.description || undefined,
      guide: s.guide || undefined,
      firstMove: s.first_move || undefined,
      unblocker: s.unblocker || undefined,
      estimatedMinutes: s.estimated_minutes > 0 ? s.estimated_minutes : undefined,
      boundarySignal: s.boundary_signal || undefined,
    };
  }

  // 트리 그룹핑 — 1차 + 그에 매달린 2차 자식.
  const childrenByParent = new Map<string, Step[]>();
  for (const s of res.result.steps) {
    if (!s.parent_step_id) continue;
    const list = childrenByParent.get(s.parent_step_id) ?? [];
    list.push(s);
    childrenByParent.set(s.parent_step_id, list);
  }
  const aiTopLevel = res.result.steps.filter((s) => s.parent_step_id === null);

  // 편집 없이 저장 — AI 결과 트리 그대로
  if (!editedSteps) {
    return {
      ...meta,
      isSingle: false,
      steps: aiTopLevel.map((p) => {
        const kids = childrenByParent.get(p.id) ?? [];
        const base = fromAi(p);
        return kids.length > 0 ? { ...base, children: kids.map(fromAi) } : base;
      }),
    };
  }

  // 편집 결과 — id(tempId)가 원본 AI 단계와 일치하면 가이드 보존, 아니면 title만.
  const aiById = new Map(res.result.steps.map((s) => [s.id, s]));
  function fromEdited(es: EditableStep): CreateStepInput {
    const title = es.title.trim();
    const orig = es.id ? aiById.get(es.id) : undefined;
    if (orig && orig.title === title) return fromAi(orig);
    return { title };
  }

  return {
    ...meta,
    isSingle: false,
    steps: editedSteps.map((parent) => {
      const base = fromEdited(parent);
      const kids = parent.children ?? [];
      return kids.length > 0 ? { ...base, children: kids.map(fromEdited) } : base;
    }),
  };
}

// 히스토리 스택을 RefineBlock의 드롭다운에서 쓸 미리보기 모양으로 압축.
// 1차 단계만 카운트하고, 첫 번째 1차 단계의 title을 라벨로 쓴다.
function buildHistoryPreviews(history: DecomposeApiResponse[]): HistoryPreview[] {
  return history.map((v) => {
    const top = v.result.steps.filter((s) => s.parent_step_id === null);
    return {
      stepCount: top.length,
      firstTitle: top[0]?.title ?? "(단계 없음)",
    };
  });
}

function BusyBar({ text = "다시 분해하는 중…" }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 text-[12.5px] text-tx2 bg-fa border border-bd2 rounded-[10px] px-3 py-2">
      <span className="w-3 h-3 rounded-full border-2 border-ac-s2 border-t-ac animate-spin" />
      {text}
    </div>
  );
}

function LoadingView() {
  return (
    <div className="px-4 lg:px-8 py-10 max-w-[520px] mx-auto w-full flex flex-col items-center text-center">
      <div className="relative w-16 h-16 mb-6">
        <span className="absolute inset-0 rounded-full border-4 border-ac-s2" />
        <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-ac animate-spin" />
      </div>
      <div className="text-lg font-bold text-tx mb-2">할 일을 단계로 쪼개고 있어요</div>
      <div className="text-sm text-mu mb-6">잠시만 기다려 주세요…</div>
    </div>
  );
}

function ErrorView({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="px-4 lg:px-8 py-10 max-w-[520px] mx-auto w-full text-center">
      <div className="text-lg font-bold text-tx mb-2">분해에 실패했어요</div>
      <div className="text-[13px] text-mu mb-5 break-words">{message}</div>
      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={onRetry}
          className="bg-ac text-white border-none rounded-[12px] px-4 py-2 text-sm font-bold cursor-pointer"
        >
          다시 시도
        </button>
        <button
          type="button"
          onClick={onBack}
          className="bg-sf border border-bd2 text-tx2 rounded-[12px] px-4 py-2 text-sm font-bold cursor-pointer"
        >
          입력 화면으로
        </button>
      </div>
    </div>
  );
}
