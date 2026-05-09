import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { decompose } from "../services/decompose";
import type {
  ConfirmActionId,
  DecomposeApiResponse,
  DecomposeRequest,
  RefineMode,
} from "../schemas/decompose";
import ResultBlock from "./result/ResultBlock";
import ReasoningBlock from "./result/ReasoningBlock";
import RefineBlock from "./result/RefineBlock";
import ConfirmBlock from "./result/ConfirmBlock";

// 결과 화면 진입 시 location.state 로 전달되는 입력. HomePage 의 navigate 와 모양을 맞춘다.
type LocationState = { input?: DecomposeRequest };

const MAX_HISTORY = 3;

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialInput = (location.state as LocationState | null)?.input;

  const [input, setInput] = useState<DecomposeRequest | null>(initialInput ?? null);
  const [data, setData] = useState<DecomposeApiResponse | null>(null);
  const [history, setHistory] = useState<DecomposeApiResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // initialInput 이 없으면 입력 화면으로 돌려보낸다.
  useEffect(() => {
    if (!initialInput) navigate("/", { replace: true });
  }, [initialInput, navigate]);

  // 첫 호출 — useEffect 두 번 실행되는 dev StrictMode 환경에서도 한 번만 보내도록 가드.
  const firedRef = useRef(false);
  useEffect(() => {
    if (!input || firedRef.current) return;
    firedRef.current = true;
    void runDecompose(input, { pushHistory: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input?.title]);

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

  function onRefine(mode: RefineMode) {
    if (!input) return;
    void runDecompose({ ...input, refineMode: mode }, { pushHistory: true });
  }

  function onRevert() {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setData(last);
      return prev.slice(0, -1);
    });
  }

  function onConfirmAction(id: ConfirmActionId) {
    // 저장 흐름은 별도 PR 의 책임. 여기서는 흐름만 연결한다.
    if (id === "back") {
      navigate("/");
      return;
    }
    if (id === "save" || id === "save-single") {
      // TODO: 실제 저장 API 와 연결되면 navigate("/all") 로 이동한다.
      alert(id === "save" ? "확정 저장은 아직 연결되지 않았어요." : "단일 저장은 아직 연결되지 않았어요.");
      return;
    }
    if (id === "edit") {
      alert("직접 수정 모드는 아직 연결되지 않았어요.");
      return;
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

  return (
    <div className="px-4 lg:px-8 py-6 max-w-[720px] mx-auto w-full">
      {busy && <BusyBar />}
      {error && (
        <div className="mb-3 text-[12.5px] text-rd bg-rd-s border border-rd-s rounded-[10px] px-3 py-2">
          {error}
        </div>
      )}

      <ResultBlock projectTitle={input.title} data={data} />
      <ReasoningBlock reasoning={data.reasoning} />
      <RefineBlock
        onRefine={onRefine}
        busy={busy}
        historyCount={history.length}
        onRevert={onRevert}
      />
      <ConfirmBlock onAction={onConfirmAction} busy={busy} />
    </div>
  );
}

function BusyBar() {
  return (
    <div className="flex items-center gap-2 mb-3 text-[12.5px] text-tx2 bg-fa border border-bd2 rounded-[10px] px-3 py-2">
      <span className="w-3 h-3 rounded-full border-2 border-ac-s2 border-t-ac animate-spin" />
      다시 분해하는 중…
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
