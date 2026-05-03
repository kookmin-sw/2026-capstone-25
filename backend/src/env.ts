import { z } from "zod";

// 백엔드에서 쓰는 환경변수를 한 곳에서 검증한다.
// 다른 파일은 process.env를 직접 읽지 않고 여기서 export한 env만 사용한다.
const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export const env = EnvSchema.parse(process.env);
