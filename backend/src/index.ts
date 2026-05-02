import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import { env } from "./env.js";
import meRouter from "./routes/me.js";

// 시스템 아키텍처: Express 서버, localhost:4000
// 프론트(localhost:5173)에서 /api/* 로 호출 → 여기서 처리
const app = express();

app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "hanbaljjak-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/me", meRouter);

// TODO: /api/decompose — Anthropic Claude Haiku 4.5 호출
// TODO: /api/tasks    — Supabase CRUD

app.listen(env.PORT, () => {
  console.log(`[hanbaljjak-backend] listening on http://localhost:${env.PORT}`);
});
