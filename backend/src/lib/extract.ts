import mammoth from "mammoth";
import type { AttachmentMime } from "../schemas/decompose.js";

// 첨부 파일 1개를 Anthropic user 메시지에 넣을 수 있는 단위로 변환한다.
// 형식별 분기:
//   - text:     txt · md         → utf-8 디코드, text block 으로 결합
//   - text:     docx             → mammoth 로 raw text 추출, text block 으로 결합
//   - document: pdf              → base64 그대로, Anthropic 네이티브 PDF document block
//   - image:    png/jpg/webp/gif → base64, Anthropic vision image block
//
// PDF 텍스트 추출(pdf-parse)을 하지 않는 이유: Anthropic 모델이 PDF document block 으로
// 텍스트+레이아웃+도표를 직접 읽는다. 추출 단계 손실 없이 더 풍부한 입력.

export type Extracted =
  | { kind: "text"; filename: string; text: string }
  | { kind: "document"; filename: string; mediaType: "application/pdf"; dataBase64: string }
  | { kind: "image"; filename: string; mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; dataBase64: string };

export class ExtractError extends Error {
  constructor(
    public filename: string,
    public reason: string,
  ) {
    super(`${filename}: ${reason}`);
    this.name = "ExtractError";
  }
}

export async function extract(
  buffer: Buffer,
  filename: string,
  contentType: AttachmentMime,
): Promise<Extracted> {
  switch (contentType) {
    case "text/plain":
    case "text/markdown":
      return { kind: "text", filename, text: buffer.toString("utf-8") };

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      try {
        const result = await mammoth.extractRawText({ buffer });
        return { kind: "text", filename, text: result.value };
      } catch (error) {
        const reason = error instanceof Error ? error.message : "DOCX 텍스트 추출 실패";
        throw new ExtractError(filename, reason);
      }
    }

    case "application/pdf":
      return {
        kind: "document",
        filename,
        mediaType: "application/pdf",
        dataBase64: buffer.toString("base64"),
      };

    case "image/png":
    case "image/jpeg":
    case "image/webp":
    case "image/gif":
      return {
        kind: "image",
        filename,
        mediaType: contentType,
        dataBase64: buffer.toString("base64"),
      };
  }
}
