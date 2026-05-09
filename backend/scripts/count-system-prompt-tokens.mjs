// 시스템 프롬프트의 정확한 토큰 수를 Anthropic count_tokens API로 산출한다.
// 실행: cd backend && node scripts/count-system-prompt-tokens.mjs
//
// 필요한 환경변수:
//   ANTHROPIC_API_KEY  — backend/.env 에서 자동 로드
//   ANTHROPIC_MODEL    — 미지정 시 claude-haiku-4-5-20251001 사용
//
// count_tokens 는 매우 저렴(거의 무료)하고, 시스템 프롬프트만 보내고 결과를
// 받아 출력한다. 캐시·실 호출과 무관하다.

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { DECOMPOSE_SYSTEM_PROMPT } from "../src/prompts/decompose-system.ts";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY가 설정되지 않았습니다. backend/.env 확인.");
  process.exit(1);
}

const client = new Anthropic({ apiKey });
const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

const result = await client.messages.countTokens({
  model,
  system: [{ type: "text", text: DECOMPOSE_SYSTEM_PROMPT }],
  // count_tokens 는 messages 가 비어 있으면 안 되어, 최소 더미를 넣는다.
  // 시스템 프롬프트 토큰만 알고 싶으면 두 번 호출해서 차이를 빼는 방법도 있지만,
  // 결과의 input_tokens 안에 system 도 포함되므로 한 번 호출이면 충분하다.
  messages: [{ role: "user", content: "ping" }],
});

const charLen = DECOMPOSE_SYSTEM_PROMPT.length;
console.log(`model: ${model}`);
console.log(`prompt char length: ${charLen}`);
console.log(`input_tokens (system + "ping"): ${result.input_tokens}`);
console.log(`approx system-only tokens: ${result.input_tokens - 5}  // 'ping' 메시지 약 4~5 tokens 차감`);
