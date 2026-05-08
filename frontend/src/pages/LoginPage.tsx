// 로그인 / 회원가입 페이지. 탭 토글로 두 모드를 하나의 폼에서 처리한다.
import { FormEvent, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

// Supabase가 반환하는 영어 에러 메시지를 한글로 변환한다.
// 매칭되지 않으면 원문을 그대로 반환.
function toKoreanError(message: string): string {
  if (message.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (message.includes("User already registered")) return "이미 가입된 이메일이에요.";
  if (message.includes("Email not confirmed")) return "이메일 인증이 필요해요. 메일함을 확인해 주세요.";
  if (message.includes("Password should be at least")) return "비밀번호는 6자 이상이어야 해요.";
  if (message.includes("Unable to validate email address")) return "올바른 이메일 형식이 아니에요.";
  if (message.includes("rate limit") || message.includes("over_email_send_rate_limit")) return "잠시 후 다시 시도해 주세요.";
  if (message.includes("Network") || message.includes("fetch")) return "네트워크 오류가 발생했어요. 연결을 확인해 주세요.";
  return message;
}

type LocationState = {
  from?: Location;
};

export default function LoginPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;
  // SessionGuard가 redirect 전 저장해 둔 원래 경로. 없으면 홈으로.
  const redirectPath = state?.from?.pathname ?? "/";
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 이미 세션이 있으면 바로 리다이렉트
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsSignedIn(Boolean(data.session));
    });
  }, []);

  // 로그인 또는 회원가입 제출 처리
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    // 회원가입 시 비밀번호 일치 검사 — Supabase 호출 전에 클라이언트에서 먼저 막는다
    if (mode === "sign-up" && password !== confirmPassword) {
      setStatus("error");
      setMessage("비밀번호가 일치하지 않아요.");
      return;
    }

    // 앞뒤 공백 제거 + 소문자 통일로 동일 이메일을 다르게 입력하는 문제를 방지
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        : await supabase.auth.signUp({ email: normalizedEmail, password });

    if (error) {
      setStatus("error");
      setMessage(toKoreanError(error.message));
      return;
    }

    setStatus("success");
    if (data.session) {
      setMessage(mode === "sign-in" ? "로그인 성공했어요." : "회원가입 성공했어요.");
      setIsSignedIn(true);
      return;
    }

    // 이메일 인증이 켜져 있으면 session이 null — 인증 메일 확인 안내
    setMessage("가입 확인 메일을 보냈어요. 메일함을 확인하고 링크를 클릭해주세요.");
  }

  if (isSignedIn) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <main className="min-h-screen bg-bg text-tx flex items-center justify-center px-6">
      <section className="w-full max-w-[420px] bg-sf border border-bd rounded-2xl px-6 py-7 shadow-sm">

        {/* ── 헤더 — 로고 + 타이틀 ── */}
        <div className="mb-7">
          <div className="font-title text-[30px] font-bold tracking-[-0.3px]">
            <em className="not-italic text-ac-d">한</em>발짝
          </div>
          <h1 className="mt-4 text-2xl font-black">로그인</h1>
          <p className="mt-2 text-sm leading-6 text-mu">
            이메일과 비밀번호로 들어오면 다음부터 세션이 유지돼요.
          </p>
        </div>

        {/* ── 모드 탭 — 로그인 / 회원가입 ── */}
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-fa p-1">
          <button
            type="button"
            onClick={() => {
              setMode("sign-in");
              setMessage("");
              setStatus("idle");
              setEmail("");
              setPassword("");
              setConfirmPassword("");
              setShowPassword(false);
              setShowConfirmPassword(false);
            }}
            className={[
              "rounded-lg py-2 text-sm font-black",
              mode === "sign-in" ? "bg-white text-tx shadow-sm" : "text-mu",
            ].join(" ")}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("sign-up");
              setMessage("");
              setStatus("idle");
              setEmail("");
              setPassword("");
              setConfirmPassword("");
              setShowPassword(false);
              setShowConfirmPassword(false);
            }}
            className={[
              "rounded-lg py-2 text-sm font-black",
              mode === "sign-up" ? "bg-white text-tx shadow-sm" : "text-mu",
            ].join(" ")}
          >
            회원가입
          </button>
        </div>

        {/* ── 폼 ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-tx">이메일</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="mt-2 w-full rounded-xl border border-bd bg-white px-4 py-3 text-sm outline-none focus:border-ac"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-tx">비밀번호</span>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                // 로그인은 저장된 비밀번호 자동완성, 회원가입은 새 비밀번호 제안
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="6자 이상"
                // [ms-reveal]:hidden — Edge 기본 비밀번호 보기 버튼 숨김
                className={[
                  "w-full rounded-xl border border-bd bg-white px-4 py-3 text-sm outline-none focus:border-ac [&::-ms-reveal]:hidden [&::-ms-clear]:hidden",
                  password ? "pr-11" : "",
                ].join(" ")}
              />
              {/* 입력값이 있을 때만 토글 버튼 표시 */}
              {password && (
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-mu hover:text-tx"
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
          </label>

          {/* 비밀번호 확인 — 회원가입 모드에서만 표시 */}
          {mode === "sign-up" && (
            <label className="block">
              <span className="text-sm font-bold text-tx">비밀번호 확인</span>
              <div className="relative mt-2">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="비밀번호를 다시 입력해주세요"
                  className={[
                    "w-full rounded-xl border border-bd bg-white px-4 py-3 text-sm outline-none focus:border-ac [&::-ms-reveal]:hidden [&::-ms-clear]:hidden",
                    confirmPassword ? "pr-11" : "",
                  ].join(" ")}
                />
                {confirmPassword && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-mu hover:text-tx"
                    aria-label={showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}
              </div>
            </label>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-xl bg-ac text-white py-3 text-sm font-black disabled:opacity-60"
          >
            {status === "submitting" ? "처리 중" : mode === "sign-in" ? "로그인하기" : "회원가입하기"}
          </button>
        </form>

        {/* 에러/성공 메시지 — role="alert"로 스크린리더에도 전달 */}
        {message && (
          <p
            role="alert"
            aria-live="polite"
            className={["mt-4 text-sm", status === "error" ? "text-red-600" : "text-ac-d"].join(" ")}
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
