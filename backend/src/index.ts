import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";

// 시스템 아키텍처: Express 서버, localhost:4000
// 프론트(localhost:5173)에서 /api/* 로 호출 → 여기서 처리
const app = express();
const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "hanbaljjak-backend",
    timestamp: new Date().toISOString(),
  });
});

// TODO: /api/decompose — Anthropic Claude Haiku 4.5 호출
// TODO: /api/tasks    — Supabase CRUD

app.listen(PORT, () => {
  console.log(`[hanbaljjak-backend] listening on http://localhost:${PORT}`);
});
