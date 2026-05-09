import { Router } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";
import { DECOMPOSE_SYSTEM_PROMPT } from "../prompts/decompose-system.js";
import {
  DecomposeRequestSchema,
  SubDecomposeRequestSchema,
  DecomposeResultSchema,
  type DecomposeRequest,
  type SubDecomposeRequest,
  type DecomposeResult,
  type DecomposeApiResponse,
} from "../schemas/decompose.js";
import { validate, type ValidationIssue } from "../validate/index.js";

const router = Router();

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// 모드별 입력을 한 묶음으로 다룬다. kind에 따라 primary(1차) / secondary(2차) 분기.
type AnyDecomposeInput =
  | { kind: "primary"; data: DecomposeRequest }
  | { kind: "secondary"; data: SubDecomposeRequest };

function buildUserMessage(
  input: AnyDecomposeInput,
  previousIssues?: ValidationIssue[],
): string {
  const lines: string[] = [];

  if (input.kind === "primary") {
    const d = input.data;
    lines.push(`# 할 일 제목\n${d.title}`);
    if (d.memo?.trim()) lines.push(`# 상세 메모\n${d.memo}`);
    if (d.startDate || d.dueDate) {
      lines.push(`# 일정\n시작일: ${d.startDate ?? "미정"} / 마감일: ${d.dueDate ?? "미정"}`);
    }
    if (d.templateHint?.trim()) lines.push(`# 템플릿 힌트\n${d.templateHint}`);
    lines.push(`# 분해 모드\n1차 분해 — 입력 전체에서 6 신호가 강하게 보이는 의미 경계를 찾아 끊어라. 단계 크기와 수는 의미 구조가 결정한다.`);

    // 재분해 방향: 사용자가 "더 잘게/더 크게/직접 얘기" 칩을 누른 경우 user 메시지로 전달한다.
    if (d.refineMode === "smaller") {
      lines.push(
        [
          `# 재분해 지시`,
          `이전 분해를 결정 부담이 더 낮은 단위로 다시 끊어라. 단계 수가 늘어나는 것은 자연스럽다.`,
          `- 한 단계 안에 별개의 결정이 두 번 이상 들어 있으면 그 결정 사이에서 쪼개라.`,
          `- 같은 활동을 다른 표현으로 반복하지 마라.`,
        ].join("\n"),
      );
    } else if (d.refineMode === "larger") {
      lines.push(
        [
          `# 재분해 지시`,
          `이전 분해를 의미 묶음으로 다시 끊어라. 단계 수가 줄어드는 것은 자연스럽다.`,
          `- 인접 단계가 같은 자리·도구·사고 흐름을 공유하면 하나로 묶어라.`,
          `- 묶었을 때 description이 자연스러운 한 문단으로 읽혀야 한다(불릿 나열로만 읽히면 다시 분리).`,
          `- 가장 강한 의미 경계(phase 전환)만 남기고 그 사이의 세부는 description에 흡수한다.`,
        ].join("\n"),
      );
    } else if (d.refineMode === "feedback") {
      const fb = d.refineFeedback?.trim();
      lines.push(
        fb
          ? `# 재분해 지시 (사용자 피드백)\n${fb}`
          : `# 재분해 지시\n사용자가 재생성을 요청했다. 같은 입력이지만 다른 경계 기준을 시도해 보라.`,
      );
    }
  } else {
    const p = input.data.parent;
    lines.push(`# 부모 단계\ntitle: ${p.step_title}\n설명: ${p.step_description}`);
    lines.push(`# 원래 과업의 목표\n${p.parent_goal}`);
    if (input.data.memo?.trim()) lines.push(`# 추가 메모\n${input.data.memo}`);
    lines.push(
      [
        `# 분해 모드`,
        `2차 분해 — 부모 단계 한 개를 그 안에서 6 신호로 다시 끊어라. 1차와 같은 6 신호·3 규칙을 그대로 적용하되, 탐색 범위만 부모 내부로 한정된다.`,
        `결과 단계의 수와 크기는 부모의 의미 구조가 결정한다 — 시간이나 분량을 미리 목표로 두지 마라.`,
        `의미 경계가 더 이상 보이지 않는 지점에서 멈춰라. 무리해서 쪼개지 마라.`,
      ].join("\n"),
    );
  }

  if (previousIssues && previousIssues.length > 0) {
    lines.push(
      [
        "# 직전 시도에서 발견된 문제",
        ...previousIssues.map((i) => `- ${i.message}`),
        "위 문제를 피해서 다시 분해하라.",
      ].join("\n"),
    );
  }

  lines.push("위 입력을 시스템 프롬프트 내용에 따라 분해하라. JSON 단일 객체만 출력.");
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

async function callAnthropic(
  input: AnyDecomposeInput,
  previousIssues?: ValidationIssue[],
): Promise<string> {
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
    messages: [{ role: "user", content: buildUserMessage(input, previousIssues) }],
  });

  console.log("[decompose] stop_reason:", response.stop_reason, "usage:", response.usage);

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

async function decomposeOnce(
  input: AnyDecomposeInput,
  previousIssues?: ValidationIssue[],
): Promise<DecomposeResult | null> {
  const text = await callAnthropic(input, previousIssues);
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

// 모드별 공통 실행기.
// 1. 분해 호출 → (실패 시 1회 재시도)
// 2. 2차 분해는 parent_step_id 강제 주입
// 3. validate → blocker가 있으면 직전 issue를 들려주고 1회 재시도 (warning은 노출만)
async function runDecompose(input: AnyDecomposeInput): Promise<{
  status: number;
  body: DecomposeApiResponse | { error: string };
}> {
  let decomposed = await decomposeOnce(input);
  if (!decomposed) decomposed = await decomposeOnce(input); // 파싱 실패 시 1회 재시도
  if (!decomposed) {
    return {
      status: 422,
      body: { error: "AI 응답을 스키마에 맞게 파싱하지 못했습니다." },
    };
  }

  // 2차 분해는 AI 출력 별개로 parent_step_id를 강제 주입.
  if (input.kind === "secondary") {
    const parentId = input.data.parent.step_id;
    decomposed = {
      ...decomposed,
      steps: decomposed.steps.map((s) => ({ ...s, parent_step_id: parentId })),
    };
  }

  
  let { issues, hasBlocker } = validate(decomposed.steps);

  // blocker만 자동 재시도. warning은 노출만.
  if (hasBlocker) {
    const blockers = issues.filter((i) => i.severity === "blocker");
    const retried = await decomposeOnce(input, blockers);
    if (retried) {
      let retriedSteps = retried.steps;
      if (input.kind === "secondary") {
        const parentId = input.data.parent.step_id;
        retriedSteps = retriedSteps.map((s) => ({ ...s, parent_step_id: parentId }));
      }
      decomposed = { ...retried, steps: retriedSteps };
      issues = validate(retriedSteps).issues;
    }
  }

  return {
    status: 200,
    body: {
      result: { analysis: decomposed.analysis, steps: decomposed.steps },
      reasoning: decomposed.reasoning,
      validation: { ok: issues.length === 0, issues },
    },
  };
}

// 1차 분해 (primary) — 입력 전체 분해
router.post("/", async (req, res) => {
  const parsed = DecomposeRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) });
    return;
  }

  try {
    const result = await runDecompose({ kind: "primary", data: parsed.data });
    res.status(result.status).json(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Anthropic call failed";
    res.status(502).json({ error: message });
  }
});

// 2차 분해 (secondary) — 부모 단계 내부 재분해
router.post("/sub", async (req, res) => {
  const parsed = SubDecomposeRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) });
    return;
  }

  try {
    const result = await runDecompose({ kind: "secondary", data: parsed.data });
    res.status(result.status).json(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Anthropic call failed";
    res.status(502).json({ error: message });
  }
});

export default router;
