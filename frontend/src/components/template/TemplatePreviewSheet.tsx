import { useEffect } from "react";
import type { Template } from "../../services/templates";

// §8.4 미리보기 바텀시트 — 아이콘+이름, 흐름 노드, 입력 안내, "이 템플릿으로 시작" 버튼.
// 백드롭 클릭과 ESC 로 닫는다. 본문 스크롤 잠금은 마운트 동안만.
type Props = {
  template: Template | null;
  onClose: () => void;
  onStart: (template: Template) => void;
};

export default function TemplatePreviewSheet({ template, onClose, onStart }: Props) {
  useEffect(() => {
    if (!template) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [template, onClose]);

  if (!template) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${template.name} 미리보기`}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 cursor-pointer"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-[520px] bg-sf rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-sf pt-3 pb-2 px-5 border-b border-bd2">
          <div className="w-10 h-1 rounded-full bg-bd mx-auto mb-3" aria-hidden />
          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none" aria-hidden>{template.icon}</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-black text-tx leading-snug break-keep">
                {template.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="shrink-0 w-8 h-8 rounded-full text-mu hover:text-tx hover:bg-fa flex items-center justify-center cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 3l8 8M11 3l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* 흐름 노드 — 구체 단계가 아니라 "어떤 종류의 일인지" 감만 전달 */}
          <div>
            <p className="text-[11px] font-bold text-ac-d tracking-wide mb-2">🧭 보통 이런 흐름이에요</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {template.previewChunks.map((line, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <span className="bg-fa border border-bd2 rounded-lg px-2.5 py-1 text-xs font-bold text-tx2">
                    {line}
                  </span>
                  {i < template.previewChunks.length - 1 && (
                    <span className="text-mu text-xs" aria-hidden>→</span>
                  )}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-mu mt-2">
              실제 단계는 입력에 따라 다르게 만들어져요.
            </p>
          </div>

          {/* 채워질 필드 안내 */}
          {template.customFields.length > 0 && (
            <div className="bg-fa border border-bd2 rounded-lg px-3 py-2.5">
              <p className="text-[11px] font-bold text-ac-d tracking-wide mb-1.5">
                💡 이런 정보들이 입력되면 좋아요!
              </p>
              <pre className="text-[11px] text-tx2 leading-relaxed whitespace-pre-wrap font-sans">
                {template.customFields.join("\n")}
              </pre>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-sf border-t border-bd2 px-5 py-3">
          <button
            type="button"
            onClick={() => onStart(template)}
            className="w-full rounded-xl bg-gradient-to-b from-ac to-ac-d text-white border-none py-3 text-sm font-black cursor-pointer hover:opacity-95 active:scale-[.98] transition-all"
          >
            이 템플릿으로 시작
          </button>
        </div>
      </div>
    </div>
  );
}
