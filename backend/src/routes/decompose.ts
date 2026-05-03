import { Router } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";
import { DECOMPOSE_SYSTEM_PROMPT } from "../prompts/decompose-system.js";
import {
  DecomposeRequestSchema,
  DecomposeResultSchema,
  type DecomposeRequest,
  type DecomposeResult,
} from "../schemas/decompose.js";

const router = Router();

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

function buildUserMessage(input: DecomposeRequest): string {
  const lines: string[] = [];
  lines.push(`# 할 일 제목\n${input.title}`);
  if (input.memo && input.memo.trim().length > 0) {
    lines.push(`# 상세 메모\n${input.memo}`);
  }
  if (input.startDate || input.dueDate) {
    lines.push(
      `# 일정\n시작일: ${input.startDate ?? "미정"} / 마감일: ${input.dueDate ?? "미정"}`,
    );
  }
  if (input.templateHint && input.templateHint.trim().length > 0) {
    lines.push(`# 템플릿 힌트\n${input.templateHint}`);
  }
  lines.push(
    "위 입력을 시스템 프롬프트에 정의된 6 신호 · 3 규칙에 따라 분해하라. JSON 단일 객체만 출력.",
  );
  return lines.join("\n\n");
}

// AI 응답 텍스트에서 첫 번째 균형 잡힌 JSON 객체를 추출한다.
// 모델이 코드펜스나 잡담을 끼워 넣을 가능성에 대비한 방어 로직.
function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

async function callAnthropic(input: DecomposeRequest): Promise<string> {
  const response = await anthropic.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 8192,
    system: [
      {
        type: "text",
        text: DECOMPOSE_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  console.log("[decompose] stop_reason:", response.stop_reason, "usage:", response.usage);

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

async function decomposeOnce(input: DecomposeRequest): Promise<DecomposeResult | null> {
  const text = await callAnthropic(input);
  console.log("[decompose] raw text length:", text.length);
  console.log("[decompose] raw text preview:", text.slice(0, 500));

  const json = extractJsonObject(text);
  if (!json) {
    console.warn("[decompose] extractJsonObject returned null — no balanced { ... } found");
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(json);
  } catch (error) {
    console.warn("[decompose] JSON.parse failed:", error instanceof Error ? error.message : error);
    console.warn("[decompose] tail:", json.slice(-300));
    return null;
  }

  const result = DecomposeResultSchema.safeParse(parsedJson);
  if (!result.success) {
    console.warn("[decompose] zod parse failed:", JSON.stringify(z.flattenError(result.error), null, 2));
    return null;
  }
  return result.data;
}

// POST 요청
router.post("/", async (req, res) => {
  const parsed = DecomposeRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) });
    return;
  }

  let decomposed: DecomposeResult | null = null;
  try {
    decomposed = await decomposeOnce(parsed.data);
    if (!decomposed) {
      // 1회 재시도. 모델이 한 번 흔들렸을 수 있다.
      decomposed = await decomposeOnce(parsed.data);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Anthropic call failed";
    res.status(502).json({ error: message });
    return;
  }

  if (!decomposed) {
    res.status(422).json({ error: "AI 응답을 스키마에 맞게 파싱하지 못했습니다." });
    return;
  }

  // 4블록 응답
  // ① result(단계 카드 리스트) ② reasoning(왜 이렇게 나눴는가)
  // ③ refine(재분해 옵션) ④ confirm(확정·수정 액션)
  res.json({
    result: {
      analysis: decomposed.analysis,
      steps: decomposed.steps,
    },
    reasoning: decomposed.reasoning,
    refine: {
      options: [
        { id: "smaller", label: "더 잘게", hint: "10~20분 단위" },
        { id: "larger", label: "더 크게", hint: "1~2시간 블록" },
        { id: "feedback", label: "AI에게 직접 얘기", hint: "피드백 입력 후 재생성" },
      ],
    },
    confirm: {
      actions: [
        { id: "save", label: "확정하기" },
        { id: "edit", label: "직접 수정하기" },
        { id: "save-single", label: "쪼개지 않고 저장" },
        { id: "back", label: "돌아가기" },
      ],
    },
  });
});

export default router;
