import { createClient } from "@supabase/supabase-js";

// 브라우저에서 쓰는 Supabase 클라이언트.
// anon key만 사용하며 로그인 세션은 Supabase가 localStorage에 관리한다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
