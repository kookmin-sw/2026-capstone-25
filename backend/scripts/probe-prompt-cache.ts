// 일회성 진단: 동일한 system 블록으로 messages.create 를 두 번 호출해
// usage.cache_creation_input_tokens / cache_read_input_tokens 를 직접 본다.
//
// 기대 동작:
//   call 1 → cache_creation_input_tokens ≈ system 토큰 수, cache_read = 0
//   call 2 → cache_read_input_tokens ≈ system 토큰 수, cache_creation = 0
// 둘 다 0 이면 캐시 자체가 안 만들어지고 있다는 뜻.

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../src/env.js";
import { DECOMPOSE_SYSTEM_PROMPT } from "../src/prompts/decompose-system.js";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

async function call(label: string) {
  const res = await client.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 30,
    system: [
      {
        type: "text",
        text: DECOMPOSE_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: "Reply with the JSON {\"ok\":true}" }],
  });
  console.log(`[${label}] usage:`, JSON.stringify(res.usage, null, 2));
}

async function main() {
  console.log("Model:", env.ANTHROPIC_MODEL);
  console.log("");
  await call("call 1");
  await call("call 2");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
