// 단계 인라인 편집 컴포넌트 — 상세 화면(J7)과 결과 화면(R6) 공용.
// 로컬 상태 없이 controlled 방식으로 동작한다. 저장은 호출 측이 담당.
// EditableStep.id: DB 저장된 단계는 실제 id, 신규 단계는 undefined.
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";

export type EditableStep = {
  id?: string;       // DB id (상세 화면) 또는 undefined (결과 화면 신규 단계)
  tempId: string;    // 로컬 식별자 — 항상 존재
  title: string;
};

type Props = {
  steps: EditableStep[];
  onChange: (next: EditableStep[]) => void;
  busy?: boolean;
};

export default function StepEditor({ steps, onChange, busy = false }: Props) {
  function updateTitle(tempId: string, title: string) {
    onChange(steps.map((s) => s.tempId === tempId ? { ...s, title } : s));
  }

  function remove(tempId: string) {
    onChange(steps.filter((s) => s.tempId !== tempId));
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...steps];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addStep() {
    const tempId = `tmp-${Date.now()}`;
    onChange([...steps, { tempId, title: "" }]);
  }

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div
          key={step.tempId}
          className="flex items-center gap-2 bg-sf border border-bd rounded-xl px-3 py-2.5"
        >
          {/* 순서 번호 */}
          <span className="w-5 text-center text-xs font-black text-mu shrink-0">{i + 1}</span>

          {/* 제목 입력 */}
          <input
            type="text"
            value={step.title}
            onChange={(e) => updateTitle(step.tempId, e.target.value)}
            disabled={busy}
            placeholder="단계 제목"
            className="flex-1 text-sm font-bold text-tx bg-transparent outline-none placeholder:text-mu2 disabled:opacity-50"
          />

          {/* ▲/▼ 버튼 */}
          <div className="flex flex-col shrink-0">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={busy || i === 0}
              className="text-mu hover:text-tx disabled:opacity-30"
              aria-label="위로"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={busy || i === steps.length - 1}
              className="text-mu hover:text-tx disabled:opacity-30"
              aria-label="아래로"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {/* 삭제 버튼 */}
          <button
            type="button"
            onClick={() => remove(step.tempId)}
            disabled={busy || steps.length <= 1}
            className="text-mu hover:text-rd disabled:opacity-30 shrink-0"
            aria-label="단계 삭제"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      {/* 단계 추가 */}
      <button
        type="button"
        onClick={addStep}
        disabled={busy}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-bd py-2.5 text-sm font-bold text-mu hover:border-ac hover:text-ac transition-colors disabled:opacity-50"
      >
        <Plus size={15} />
        단계 추가
      </button>
    </div>
  );
}
