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
} from "../schemas/decompose.js";
import { validate, type ValidationIssue } from "../validate/index.js";

const router = Router();

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// 모드별 입력을 한 묶음으로 다룬다. kind에 따라 phase(1차) / atomic(2차) 분기.
type AnyDecomposeInput =
  | { kind: "phase"; data: DecomposeRequest }
  | { kind: "atomic"; data: SubDecomposeRequest };

function buildUserMessage(
  input: AnyDecomposeInput,
  previousIssues?: ValidationIssue[],
): string {
  const lines: string[] = [];

  if (input.kind === "phase") {
    const d = input.data;
    lines.push(`# 할 일 제목\n${d.title}`);
    if (d.memo?.trim()) lines.push(`# 상세 메모\n${d.memo}`);
    if (d.startDate || d.dueDate) {
      lines.push(`# 일정\n시작일: ${d.startDate ?? "미정"} / 마감일: ${d.dueDate ?? "미정"}`);
    }
    if (d.templateHint?.trim()) lines.push(`# 템플릿 힌트\n${d.templateHint}`);
    lines.push(`# 분해 모드\n1차 분해 — phase 단위로 끊어라. 단계당 시간 제한 없음.`);
  } else {
    const p = input.data.parent;
    lines.push(`# 부모 단계\nstep_id: ${p.step_id}\ntitle: ${p.step_title}\n설명: ${p.step_description}`);
    lines.push(`# 원래 과업의 목표\n${p.parent_goal}`);
    if (input.data.memo?.trim()) lines.push(`# 추가 메모\n${input.data.memo}`);
    lines.push(`# 분해 모드\n2차 분해 — 부모 단계를 atomic 단위로 끊어라. 단계당 estimated_minutes는 15~90분.`);
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

  lines.push("위 입력을 시스템 프롬프트의 6 신호 · 3 규칙에 따라 분해하라. JSON 단일 객체만 출력.");
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
  body: Record<string, unknown>;
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
  if (input.kind === "atomic") {
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
      if (input.kind === "atomic") {
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
    },
  };
}

// 1차 분해 — phase 단위
router.post("/", async (req, res) => {
  const parsed = DecomposeRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) });
    return;
  }

  try {
    const result = await runDecompose({ kind: "phase", data: parsed.data });
    res.status(result.status).json(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Anthropic call failed";
    res.status(502).json({ error: message });
  }
});

// 2차 분해 — atomic 단위
router.post("/sub", async (req, res) => {
  const parsed = SubDecomposeRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) });
    return;
  }

  try {
    const result = await runDecompose({ kind: "atomic", data: parsed.data });
    res.status(result.status).json(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Anthropic call failed";
    res.status(502).json({ error: message });
  }
});

export default router;
