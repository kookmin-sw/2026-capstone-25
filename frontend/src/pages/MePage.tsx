import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getUserInfo } from "../services/me";
import LoadingState from "../components/LoadingState";

export default function MePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserInfo()
      .then((info) => setEmail(info.email))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="px-[18px] py-6 space-y-4">
      {loading ? (
        <LoadingState title="내 정보를 불러오고 있어요" className="max-w-[520px]" />
      ) : (
        <>
          {/* 내 계정 카드 */}
          <div className="bg-sf border border-bd2 rounded-2xl px-4 py-3.5 shadow-sm">
            <p className="text-[11px] font-bold text-mu mb-1">내 계정</p>
            <p className="text-sm font-bold text-tx">{email ?? "-"}</p>
          </div>

          {/* 로그아웃 */}
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex items-center gap-1.5 rounded-xl border border-bd px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </>
      )}
    </div>
  );
}
