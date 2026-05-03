import type { NextFunction, Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

// Authorization: Bearer <access_token>을 검증하고 req.userId를 채운다.
// 보호 API는 이 미들웨어 뒤에서 현재 로그인 유저 기준으로 DB를 조회한다.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    res.status(401).json({ error: "Missing Authorization bearer token" });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.userId = data.user.id;
  req.userEmail = data.user.email ?? undefined;

  await supabase.from("users").upsert({
    id: data.user.id,
    email: data.user.email ?? "",
  });

  next();
}
