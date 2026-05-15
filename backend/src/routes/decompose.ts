import { Router } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";
import { supabase } from "../lib/supabase.js";
import { extract, ExtractError, type Extracted } from "../lib/extract.js";
import { DECOMPOSE_SYSTEM_PROMPT } from "../prompts/decompose-system.js";
import {
  DecomposeRequestSchema,
  SubDecomposeRequestSchema,
  DecomposeResultSchema,
  type AttachmentRef,
  type DecomposeRequest,
  type SubDecomposeRequest,
  type DecomposeResult,
  type DecomposeApiResponse,
} from "../schemas/decompose.js";
import { validate, type ValidationIssue } from "../validate/index.js";

const ATTACHMENTS_BUCKET = "decompose-attachments";

// 같은 ResultPage 세션에서 사용자가 재분해 칩(더 잘게/더 크게/피드백)을 누르면 같은 path 가 다시 들어온다.
// path → Extracted 를 모듈 스코프 LRU Map 으로 들고 있어 Storage 다운로드 + PDF/DOCX 추출 CPU 를 절약한다.
//
// 메모리 안전 — Extracted 본체(PDF base64 등 ~6.7MB)가 누적되는 곳이라 상한을 강제한다.
// LRU 정책: 최근 접근한 항목을 Map 끝으로 옮기고, size 초과 시 가장 오래된 항목(첫 키)을 evict.
// JavaScript Map 은 삽입 순서를 보존하므로 별도 자료구조 없이 LRU 가능.
//
// 프로세스 재시작 시 자연 폐기 — TTL 또는 Cleanup 엔드포인트 불필요.
const EXTRACT_CACHE_MAX_ENTRIES = 20;
const extractCache = new Map<string, Extracted>();

function cacheGet(key: string): Extracted | undefined {
  const v = extractCache.get(key);
  if (v !== undefined) {
    // 최근 접근 → Map 끝으로 재삽입 (가장 최근 위치)
    extractCache.delete(key);
    extractCache.set(key, v);
  }
  return v;
}

function cacheSet(key: string, value: Extracted): void {
  if (extractCache.has(key)) {
    extractCache.delete(key);
  } else if (extractCache.size >= EXTRACT_CACHE_MAX_ENTRIES) {
    const oldest = extractCache.keys().next().value;
    if (oldest !== undefined) {
      extractCache.delete(oldest);
      console.log(`[decompose:extract] LRU evict ${oldest.slice(0, 60)}…`);
    }
  }
  extractCache.set(key, value);
}

const router = Router();

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// 모드별 입력을 한 묶음으로 다룬다. kind에 따라 primary(1차) / secondary(2차) 분기.
type AnyDecomposeInput =
  | { kind: "primary"; data: DecomposeRequest; attachments?: Extracted[] }
  | { kind: "secondary"; data: SubDecomposeRequest };

// Anthropic SDK 의 user content block 타입.
// text/document/image 가 한 messages.create 호출의 user content 배열 안에 혼합 가능.
type UserContentBlock = Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam | Anthropic.Messages.DocumentBlockParam;

// AttachmentRef → Extracted 변환. Storage 에서 다운로드 후 형식별 추출.
// 같은 path 가 이미 캐시에 있으면 그대로 재사용 (재분해 시 다운로드 + 추출 둘 다 스킵).
//
// 정책 — path 키만 사용. 같은 ResultPage 세션 안에서만 캐시 적중을 노린다.
// 다른 세션에서 같은 파일을 다시 올려도(새 sessionId → 새 path) 캐시 MISS — 새로 추출.
// 이렇게 두는 이유:
//   1) 의도 일치: "같은 분해 세션의 재분해 비용 절감"이라는 본래 목적과 정확히 부합
//   2) 사용자 격리: 사용자 간 메모리 캐시 우연 공유 케이스 제거
//   3) Cleanup 단순화: hash 역인덱스 불필요
async function downloadAndExtract(refs: AttachmentRef[]): Promise<Extracted[]> {
  const results: Extracted[] = [];
  for (const ref of refs) {
    const cached = cacheGet(ref.path);
    if (cached) {
      console.log(`[decompose:extract] cache HIT ${ref.filename} → ${ref.path}`);
      results.push(cached);
      continue;
    }

    console.log(`[decompose:extract] cache MISS, downloading ${ref.filename} from Storage`);
    const { data: blob, error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .download(ref.path);
    if (error || !blob) {
      throw new ExtractError(ref.filename, error?.message ?? "Storage 다운로드 실패");
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    console.log(`[decompose:extract] extracting ${ref.filename} (${buffer.length} bytes)`);
    const extracted = await extract(buffer, ref.filename, ref.contentType);
    cacheSet(ref.path, extracted);
    results.push(extracted);
  }
  return results;
}

// 추출된 첨부를 Anthropic content block 배열로 변환.
// text/docx → text block · pdf → document block · 이미지 → image block.
function attachmentsToBlocks(items: Extracted[]): UserContentBlock[] {
  const blocks: UserContentBlock[] = [];
  for (const item of items) {
    if (item.kind === "text") {
      blocks.push({
        type: "text",
        text: `# 첨부 파일 — ${item.filename}\n${item.text}`,
      });
    } else if (item.kind === "document") {
      blocks.push({
        type: "text",
        text: `# 첨부 파일 — ${item.filename} (PDF)`,
      });
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: item.mediaType, data: item.dataBase64 },
      });
    } else {
      blocks.push({
        type: "text",
        text: `# 첨부 이미지 — ${item.filename}`,
      });
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: item.mediaType, data: item.dataBase64 },
      });
    }
  }
  return blocks;
}

function buildUserMessage(
  input: AnyDecomposeInput,
  previousIssues?: ValidationIssue[],
): UserContentBlock[] {
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
      // 피드백 모드에 한해 직전 분해 결과를 함께 보낸다 — "3번째 단계가 모호해" 같은 참조 표현을 모델이 해석할 수 있도록.
      // smaller/larger는 같은 입력에서 다른 입자도로 새로 그리는 일이라 직전 결과 없이 작동하므로 첨부하지 않는다.
      // description은 토큰 폭주 가드로 200자 cap.
      if (fb && d.previousSteps && d.previousSteps.length > 0) {
        const previousBlock = [
          `# 직전 분해 결과 (사용자가 지금 보고 있는 것)`,
          ...d.previousSteps.map(
            (s, i) =>
              `${i + 1}. [${s.id}] ${s.title} — ${s.description.slice(0, 200)}`,
          ),
        ].join("\n");
        lines.push(previousBlock);
        lines.push(
          `# 재분해 지시 (사용자 피드백)\n${fb}\n위 피드백을 직전 분해 결과에 비추어 해석해 다시 분해하라.`,
        );
      } else if (fb) {
        // previousSteps 없이 피드백만 온 경우 — 텍스트만 전달.
        lines.push(`# 재분해 지시 (사용자 피드백)\n${fb}`);
      } else {
        // 빈 피드백 폴백 — 직전 결과를 첨부하지 않아 anchoring을 피한다.
        lines.push(
          `# 재분해 지시\n사용자가 재생성을 요청했다. 같은 입력이지만 다른 경계 기준을 시도해 보라.`,
        );
      }
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

  const introText = lines.join("\n\n");

  // 1차 분해의 첨부는 도입부 텍스트와 마무리 지시 사이에 끼워 넣는다.
  // (도입부 → 첨부 블록들 → 마무리 지시 순서로 모델이 읽도록.)
  const attachmentBlocks: UserContentBlock[] =
    input.kind === "primary" && input.attachments && input.attachments.length > 0
      ? attachmentsToBlocks(input.attachments)
      : [];

  const closingText = "위 입력을 시스템 프롬프트 내용에 따라 분해하라. JSON 단일 객체만 출력.";

  return [
    { type: "text", text: introText },
    ...attachmentBlocks,
    { type: "text", text: closingText },
  ];
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
async function runDecompose(
  input: AnyDecomposeInput,
): Promise<{
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

  // 첨부가 있으면 Storage 에서 다운로드 후 추출. 추출 실패는 422 로 사용자 친화 메시지.
  let attachments: Extracted[] | undefined;
  if (parsed.data.attachments && parsed.data.attachments.length > 0) {
    try {
      attachments = await downloadAndExtract(parsed.data.attachments);
    } catch (error) {
      if (error instanceof ExtractError) {
        res.status(422).json({
          error: `첨부 파일 처리 실패: ${error.filename} — ${error.reason}`,
        });
        return;
      }
      throw error;
    }
  }

  try {
    const result = await runDecompose({ kind: "primary", data: parsed.data, attachments });
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
