import { FormEvent, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

type LocationState = {
  from?: Location;
};

export default function LoginPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const redirectPath = state?.from?.pathname ?? "/";
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsSignedIn(Boolean(data.session));
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const { data, error } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("success");
    if (data.session) {
      setMessage(mode === "sign-in" ? "로그인 성공했어요." : "회원가입 성공했어요.");
      setIsSignedIn(true);
      return;
    }

    setMessage("회원가입을 바로 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
  }

  if (isSignedIn) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <main className="min-h-screen bg-bg text-tx flex items-center justify-center px-6">
      <section className="w-full max-w-[420px] bg-sf border border-bd rounded-2xl px-6 py-7 shadow-sm">
        <div className="mb-7">
          <div className="font-title text-[30px] font-bold tracking-[-0.3px]">
            <em className="not-italic text-ac-d">한</em>발짝
          </div>
          <h1 className="mt-4 text-2xl font-black">로그인</h1>
          <p className="mt-2 text-sm leading-6 text-mu">
            이메일과 비밀번호로 들어오면 다음부터 세션이 유지돼요.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-xl bg-fa p-1">
          <button
            type="button"
            onClick={() => {
              setMode("sign-in");
              setMessage("");
              setStatus("idle");
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
            }}
            className={[
              "rounded-lg py-2 text-sm font-black",
              mode === "sign-up" ? "bg-white text-tx shadow-sm" : "text-mu",
            ].join(" ")}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-tx">이메일</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="mt-2 w-full rounded-xl border border-bd bg-white px-4 py-3 text-sm outline-none focus:border-ac"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-tx">비밀번호</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="6자 이상"
              className="mt-2 w-full rounded-xl border border-bd bg-white px-4 py-3 text-sm outline-none focus:border-ac"
            />
          </label>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-xl bg-ac text-white py-3 text-sm font-black disabled:opacity-60"
          >
            {status === "submitting" ? "처리 중" : mode === "sign-in" ? "로그인하기" : "회원가입하기"}
          </button>
        </form>

        {message && (
          <p className={["mt-4 text-sm", status === "error" ? "text-red-600" : "text-ac-d"].join(" ")}>
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
