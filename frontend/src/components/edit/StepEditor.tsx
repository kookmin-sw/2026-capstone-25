// 단계 인라인 편집 컴포넌트 — 상세 화면(J7)·결과 화면(R6) 공용.
// 1·2차 트리를 한 화면에 들여쓰기로 펼쳐 편집한다.
// EditableStep.children: 자식이 있으면 들여쓰기로 그 아래에 나란히 렌더된다. 깊이는 2차까지.
// 로컬 상태 없이 controlled 방식 — 저장은 호출 측 책임.
import { ChevronUp, ChevronDown, Trash2, Plus, CornerDownRight } from "lucide-react";

export type EditableStep = {
  id?: string;        // DB id (편집 시작 시 채워짐) 또는 undefined (신규 추가)
  tempId: string;     // 로컬 식별자 — 항상 존재
  title: string;
  children?: EditableStep[];
};

type Props = {
  steps: EditableStep[];
  onChange: (next: EditableStep[]) => void;
  busy?: boolean;
};

let tempIdCounter = 0;
function nextTempId(): string {
  tempIdCounter += 1;
  return `tmp-${Date.now()}-${tempIdCounter}`;
}

export default function StepEditor({ steps, onChange, busy = false }: Props) {
  // ── 1차(부모) 단계 조작 ──
  function updateParentTitle(tempId: string, title: string) {
    onChange(steps.map((s) => (s.tempId === tempId ? { ...s, title } : s)));
  }

  function removeParent(tempId: string) {
    onChange(steps.filter((s) => s.tempId !== tempId));
  }

  function moveParent(index: number, direction: -1 | 1) {
    const next = [...steps];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addParent() {
    onChange([...steps, { tempId: nextTempId(), title: "" }]);
  }

  // ── 2차(자식) 단계 조작 ──
  function updateChild(parentTempId: string, childTempId: string, title: string) {
    onChange(
      steps.map((p) =>
        p.tempId !== parentTempId
          ? p
          : {
              ...p,
              children: p.children?.map((c) => (c.tempId === childTempId ? { ...c, title } : c)),
            },
      ),
    );
  }

  function removeChild(parentTempId: string, childTempId: string) {
    onChange(
      steps.map((p) =>
        p.tempId !== parentTempId
          ? p
          : { ...p, children: (p.children ?? []).filter((c) => c.tempId !== childTempId) },
      ),
    );
  }

  function moveChild(parentTempId: string, childIndex: number, direction: -1 | 1) {
    onChange(
      steps.map((p) => {
        if (p.tempId !== parentTempId) return p;
        const children = [...(p.children ?? [])];
        const target = childIndex + direction;
        if (target < 0 || target >= children.length) return p;
        [children[childIndex], children[target]] = [children[target], children[childIndex]];
        return { ...p, children };
      }),
    );
  }

  function addChild(parentTempId: string) {
    onChange(
      steps.map((p) =>
        p.tempId !== parentTempId
          ? p
          : { ...p, children: [...(p.children ?? []), { tempId: nextTempId(), title: "" }] },
      ),
    );
  }

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={step.tempId} className="space-y-1.5">
          {/* ── 1차 단계 행 ── */}
          <div className="flex items-center gap-2 bg-sf border border-bd rounded-xl px-3 py-2.5">
            <span className="w-5 text-center text-xs font-black text-mu shrink-0">{i + 1}</span>
            <input
              type="text"
              value={step.title}
              onChange={(e) => updateParentTitle(step.tempId, e.target.value)}
              disabled={busy}
              placeholder="단계 제목"
              className="flex-1 text-sm font-bold text-tx bg-transparent outline-none placeholder:text-mu2 disabled:opacity-50"
            />
            <div className="flex flex-col shrink-0">
              <button
                type="button"
                onClick={() => moveParent(i, -1)}
                disabled={busy || i === 0}
                className="text-mu hover:text-tx disabled:opacity-30"
                aria-label="위로"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => moveParent(i, 1)}
                disabled={busy || i === steps.length - 1}
                className="text-mu hover:text-tx disabled:opacity-30"
                aria-label="아래로"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => removeParent(step.tempId)}
              disabled={busy || steps.length <= 1}
              className="text-mu hover:text-rd disabled:opacity-30 shrink-0"
              aria-label="단계 삭제"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* ── 자식 단계 들여쓰기 영역 ── */}
          {step.children && step.children.length > 0 && (
            <div className="pl-6 space-y-1.5">
              {step.children.map((child, ci) => (
                <div
                  key={child.tempId}
                  className="flex items-center gap-2 bg-fa border border-bd2 rounded-lg px-2.5 py-2"
                >
                  <CornerDownRight size={12} className="text-mu shrink-0" />
                  <span className="w-4 text-center text-[11px] font-black text-mu shrink-0">{ci + 1}</span>
                  <input
                    type="text"
                    value={child.title}
                    onChange={(e) => updateChild(step.tempId, child.tempId, e.target.value)}
                    disabled={busy}
                    placeholder="하위 단계 제목"
                    className="flex-1 text-xs font-bold text-tx bg-transparent outline-none placeholder:text-mu2 disabled:opacity-50"
                  />
                  <div className="flex flex-col shrink-0">
                    <button
                      type="button"
                      onClick={() => moveChild(step.tempId, ci, -1)}
                      disabled={busy || ci === 0}
                      className="text-mu hover:text-tx disabled:opacity-30"
                      aria-label="위로"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveChild(step.tempId, ci, 1)}
                      disabled={busy || ci === (step.children?.length ?? 0) - 1}
                      className="text-mu hover:text-tx disabled:opacity-30"
                      aria-label="아래로"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeChild(step.tempId, child.tempId)}
                    disabled={busy}
                    className="text-mu hover:text-rd disabled:opacity-30 shrink-0"
                    aria-label="하위 단계 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 하위 추가 — 자식이 이미 있는 단계에만 노출 (없는 단계는 "2단계 쪼개기"로 만들어야 의미가 있음) */}
          {step.children && step.children.length > 0 && (
            <div className="pl-6">
              <button
                type="button"
                onClick={() => addChild(step.tempId)}
                disabled={busy}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-bd py-1.5 text-[11px] font-bold text-mu hover:border-ac hover:text-ac transition-colors disabled:opacity-50"
              >
                <Plus size={12} />
                하위 단계 추가
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addParent}
        disabled={busy}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-bd py-2.5 text-sm font-bold text-mu hover:border-ac hover:text-ac transition-colors disabled:opacity-50"
      >
        <Plus size={15} />
        단계 추가
      </button>
    </div>
  );
}
