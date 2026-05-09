import { createClient } from "@supabase/supabase-js";
import { env } from "../env.js";

// 서버 전용 Supabase 클라이언트.
// service_role 키를 쓰므로 백엔드에서만 import한다.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
