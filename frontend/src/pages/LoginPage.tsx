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
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsSignedIn(Boolean(data.session));
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("메일함에서 로그인 링크를 확인해 주세요.");
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
            이메일로 받은 Magic Link를 눌러 이어서 작업해요.
          </p>
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

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl bg-ac text-white py-3 text-sm font-black disabled:opacity-60"
          >
            {status === "sending" ? "보내는 중" : "Magic Link 받기"}
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
