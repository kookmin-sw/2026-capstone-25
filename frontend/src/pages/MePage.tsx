// 나(My) 탭 — 계정 관련 기능 모음. 현재는 로그아웃만 제공.
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function MePage() {
  const navigate = useNavigate();

  // Supabase 세션 종료 후 로그인 페이지로 이동
  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="px-[18px] py-6">
      <h1 className="text-[22px] font-bold text-tx tracking-[-0.3px] mb-8">나</h1>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-xl border border-bd px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
      >
        <LogOut size={18} />
        로그아웃
      </button>
    </div>
  );
}
