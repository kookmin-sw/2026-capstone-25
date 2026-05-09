// SDK 를 우회해 fetch 로 직접 호출. cache_control 직렬화 + 베타 헤더 영향 둘 다 확인한다.
// 4번 호출:
//   noBeta-1 / noBeta-2  : 베타 헤더 없이 동일 system 으로 두 번
//   withBeta-1 / withBeta-2 : anthropic-beta 헤더 추가하고 두 번
// 어디서 cache_creation > 0 이 처음 발생하는지 보면 원인이 좁혀진다.

import "dotenv/config";
import { env } from "../src/env.js";
import { DECOMPOSE_SYSTEM_PROMPT } from "../src/prompts/decompose-system.js";

type Usage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

async function call(label: string, opts: { beta: boolean }) {
  const body = {
    model: env.ANTHROPIC_MODEL,
    max_tokens: 20,
    system: [
      {
        type: "text",
        text: DECOMPOSE_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: "Reply: ok" }],
  };

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  };
  if (opts.beta) headers["anthropic-beta"] = "prompt-caching-2024-07-31";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.log(`[${label}] HTTP ${res.status}:`, (await res.text()).slice(0, 300));
    return;
  }
  const json = (await res.json()) as { usage: Usage };
  const u = json.usage;
  console.log(
    `[${label}] in=${u.input_tokens} create=${u.cache_creation_input_tokens} read=${u.cache_read_input_tokens} out=${u.output_tokens}`,
  );
}

async function main() {
  console.log("Model:", env.ANTHROPIC_MODEL);
  await call("noBeta-1", { beta: false });
  await call("noBeta-2", { beta: false });
  await call("withBeta-1", { beta: true });
  await call("withBeta-2", { beta: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
