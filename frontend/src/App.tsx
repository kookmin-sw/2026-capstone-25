import { useEffect, useState } from "react";

type Health = { status: string; service: string; timestamp: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 640 }}>
      <h1>한발짝</h1>
      <p>React 18 + Vite 5 — localhost:5173</p>
      <section style={{ marginTop: "1.5rem" }}>
        <h2>백엔드 연결</h2>
        {error && <p style={{ color: "crimson" }}>오류: {error}</p>}
        {health && (
          <pre style={{ background: "#f4f4f4", padding: "1rem" }}>
            {JSON.stringify(health, null, 2)}
          </pre>
        )}
        {!health && !error && <p>확인 중…</p>}
      </section>
    </main>
  );
}
