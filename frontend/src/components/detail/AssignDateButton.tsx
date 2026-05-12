// 단계 카드 내 날짜 배정 버튼.
// 📅 아이콘 클릭 → date input 팝오버 → POST /api/calendar.
// 배정 성공 시 onAssigned 콜백으로 배정 id를 부모에 전달한다.
// 이미 배정된 경우(assignedDate) 날짜를 표시하고, 클릭 시 다른 날짜로 변경 가능.
import { useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { createAssignment } from "../../services/calendar";

type Props = {
  stepId: string;
  assignedDate?: string | null;   // 이미 배정된 날짜 (YYYY-MM-DD)
  onAssigned?: (assignmentId: string, date: string) => void;
};

// YYYY-MM-DD → "M월 D일" 형식으로 변환
function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function AssignDateButton({ stepId, assignedDate, onAssigned }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  // 날짜 선택 완료 시 API 호출
  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const date = e.target.value;
    if (!date) return;

    setLoading(true);
    try {
      const { id } = await createAssignment(stepId, date);
      onAssigned?.(id, date);
    } catch {
      // 실패 시 조용히 무시 (UI는 변경 없음)
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.showPicker(); }}
        disabled={loading}
        className={[
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-colors cursor-pointer",
          assignedDate
            ? "bg-ac-s border-ac text-ac-d"
            : "bg-fa border-bd text-tx2 hover:bg-ac-s hover:text-ac-d hover:border-ac",
        ].join(" ")}
        aria-label="날짜 배정"
      >
        <CalendarDays size={12} />
        {assignedDate ? formatDate(assignedDate) : "날짜 배정"}
      </button>

      {/* 숨겨진 date input — showPicker()로 브라우저 기본 날짜 선택기를 연다 */}
      <input
        ref={inputRef}
        type="date"
        className="absolute inset-0 opacity-0 w-0 h-0 pointer-events-none"
        onChange={handleChange}
        value={assignedDate ?? ""}
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
