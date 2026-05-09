// 일회성 측정: DECOMPOSE_SYSTEM_PROMPT 가 ephemeral prompt cache 임계를 넘기는지 확인.
// Haiku 4.5 의 cache 최소 토큰은 2048, Sonnet/Opus 는 1024.
// 시스템 블록이 임계 미만이면 cache_control 을 걸어도 캐시되지 않는다.

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../src/env.js";
import { DECOMPOSE_SYSTEM_PROMPT } from "../src/prompts/decompose-system.js";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

async function main() {
  const withSystem = await client.messages.countTokens({
    model: env.ANTHROPIC_MODEL,
    system: [{ type: "text", text: DECOMPOSE_SYSTEM_PROMPT }],
    messages: [{ role: "user", content: "x" }],
  });

  const baseline = await client.messages.countTokens({
    model: env.ANTHROPIC_MODEL,
    messages: [{ role: "user", content: "x" }],
  });

  const systemTokens = withSystem.input_tokens - baseline.input_tokens;

  const HAIKU_MIN = 2048;
  const SONNET_OPUS_MIN = 1024;

  console.log("Model:", env.ANTHROPIC_MODEL);
  console.log("System prompt characters:", DECOMPOSE_SYSTEM_PROMPT.length);
  console.log("countTokens (system+user 'x'):", withSystem.input_tokens);
  console.log("countTokens (user 'x' only):", baseline.input_tokens);
  console.log("Estimated system prompt tokens:", systemTokens);
  console.log("");
  console.log(`Haiku threshold (>= ${HAIKU_MIN}):       ${systemTokens >= HAIKU_MIN ? "PASS" : "FAIL"}`);
  console.log(`Sonnet/Opus threshold (>= ${SONNET_OPUS_MIN}): ${systemTokens >= SONNET_OPUS_MIN ? "PASS" : "FAIL"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
