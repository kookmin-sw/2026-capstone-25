// 브라우저용 Supabase 클라이언트 싱글톤.
// 인증 세션과 Storage 접근의 단일 진입점이며, anon key만 사용한다.
// 환경변수가 비어 있으면 즉시 throw 해서 잘못된 빌드 산출물이 배포되는 것을 막는다.

import { createClient } from "@supabase/supabase-js";

// 브라우저에서 쓰는 Supabase 클라이언트.
// anon key만 사용하며 로그인 세션은 Supabase가 localStorage에 관리한다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
