import type { ConfirmActionId } from "../../schemas/decompose";

// §3.3 ④ 확정·수정 블록 — 확정하기 / 직접 수정하기 / 쪼개지 않고 저장 / 돌아가기.
// 정적 메뉴라 백엔드 응답에 포함하지 않고 여기서 직접 라벨을 둔다.
type Props = {
  onAction: (id: ConfirmActionId) => void;
  busy: boolean;
};

export default function ConfirmBlock({ onAction, busy }: Props) {
  return (
    <div className="flex flex-col gap-[9px] mt-2">
      <button
        type="button"
        onClick={() => onAction("save")}
        disabled={busy}
        className={[
          "w-full border-none rounded-[14px] py-[15px] text-[14.5px] font-bold cursor-pointer transition-all",
          "bg-gradient-to-b from-ac to-ac-d text-white",
          "shadow-[0_8px_20px_rgba(255,133,103,.35),inset_0_-3px_0_rgba(0,0,0,.08),inset_0_2px_0_rgba(255,255,255,.25)]",
          "active:scale-[.97] active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        확정하기
      </button>

      <button
        type="button"
        onClick={() => onAction("edit")}
        disabled={busy}
        className={[
          "w-full bg-sf border border-ac text-ac-d rounded-[14px] py-[13px]",
          "text-[14px] font-bold cursor-pointer",
          "hover:bg-ac-s disabled:opacity-50 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        직접 수정하기
      </button>

      <div className="flex">
        <button
          type="button"
          onClick={() => onAction("save-single")}
          disabled={busy}
          className="flex-1 bg-transparent border-none text-mu text-[12.5px] font-semibold py-[10px] cursor-pointer hover:text-tx2 disabled:opacity-50"
        >
          쪼개지 않고 저장
        </button>
        <div className="w-px bg-bd2 my-[6px]" />
        <button
          type="button"
          onClick={() => onAction("back")}
          disabled={busy}
          className="flex-1 bg-transparent border-none text-mu text-[12.5px] font-semibold py-[10px] cursor-pointer hover:text-tx2 disabled:opacity-50"
        >
          돌아가기
        </button>
      </div>
    </div>
  );
}
