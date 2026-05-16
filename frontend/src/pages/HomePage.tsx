import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { DecomposeRequest } from "../schemas/decompose";
import { createProject } from "../services/projects";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  TEMPLATES,
  getFeaturedTemplates,
  getTemplatesByCategory,
  joinCustomFieldsAsMemo,
  type Template,
  type TemplateCategory,
} from "../services/templates";
import TemplateCard from "../components/template/TemplateCard";
import TemplatePreviewSheet from "../components/template/TemplatePreviewSheet";

const ACCEPTED_FILE_EXT = [
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
];
const MAX_FILES = 3;
const TITLE_MAX = 30;

const formSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해주세요")
    .max(TITLE_MAX, `제목은 최대 ${TITLE_MAX}자까지 입력할 수 있어요`),
  description: z.string().max(2000).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  wantSplit: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

type TabKey = "direct" | "template";

export default function HomePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("direct");
  const [files, setFiles] = useState<File[]>([]);

  // 선택한 템플릿 — null 이면 일반 직접 입력. 적용 시 폼이 prefill 되고 상단에 뱃지가 뜬다.
  // structureHint 는 onSubmit 에서 input.templateHint 로 흘려보낸다.
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  // 미리보기 바텀시트가 보여주는 템플릿. 카드 탭 시 set, 닫기/시작 시 null.
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: "",
      dueDate: "",
      wantSplit: true,
    },
  });

  const title = watch("title") ?? "";
  const wantSplit = watch("wantSplit");

  function onAddFiles(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).filter((f) => {
      const dot = f.name.lastIndexOf(".");
      const ext = dot >= 0 ? f.name.slice(dot).toLowerCase() : "";
      return ACCEPTED_FILE_EXT.includes(ext);
    });
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
    e.target.value = ""; // 같은 파일 재선택을 위해 초기화
  }

  function onRemoveFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // 미리보기 바텀시트에서 "이 템플릿으로 시작" — 메모만 채우고 제목·일정은 사용자가 직접 입력.
  // customFields placeholder 가 메모에 들어가 "어떤 정보를 적으면 좋은지" 안내 역할을 한다.
  function onStartTemplate(t: Template) {
    setSelectedTemplate(t);
    setPreviewTemplate(null);
    setValue("description", joinCustomFieldsAsMemo(t.customFields), { shouldDirty: true });
    setValue("wantSplit", true, { shouldDirty: true });
    setTab("direct");
  }

  // 적용된 템플릿 제거 — 입력 값은 그대로 두되 뱃지와 structureHint 전달만 끊는다.
  function clearTemplateBadge() {
    setSelectedTemplate(null);
  }

  async function onSubmit(values: FormValues) {
    // AI 쪼개기 OFF — 단일 할 일로 저장 후 전체 목록으로 이동
    if (!values.wantSplit) {
      try {
        await createProject({
          title: values.title,
          goal: values.title,
          memo: values.description?.trim() || undefined,
          startDate: values.startDate || undefined,
          due: values.dueDate || undefined,
          isSingle: true,
          steps: [],
        });
        navigate("/all");
      } catch {
        alert("할 일 추가에 실패했어요. 다시 시도해주세요.");
      }
      return;
    }

    // AI 쪼개기 ON — 결과 페이지로 입력 전달. 분해 호출과 화면 렌더는 ResultPage 책임.
    // 첨부 파일은 ResultPage 가 Supabase Storage 에 업로드하고 path 를 input.attachments 로 채워 넣는다.
    // 선택된 템플릿의 structureHint 는 templateHint 필드로 흘려보낸다 — 백엔드는
    // 동적 user 메시지의 "# 템플릿 힌트" 섹션으로 부착하므로 시스템 프롬프트 접두부 캐시는 그대로 유지된다.
    const input: DecomposeRequest = {
      title: values.title,
      memo: values.description?.trim() || undefined,
      startDate: values.startDate || undefined,
      dueDate: values.dueDate || undefined,
      templateHint: selectedTemplate?.structureHint?.trim() || undefined,
    };
    navigate("/result", { state: { input, files } });
  }

  return (
    <div className="px-[18px] py-6">
      <div className="text-[15px] font-bold text-tx mb-[14px] pl-[7px]">
        할 일을 작게 만들어볼까요?
      </div>

      {/* Tab segment */}
      <div className="flex bg-fa rounded-xl p-1 gap-1 mb-[14px]">
        <button type="button" onClick={() => setTab("direct")} className={tabClass(tab === "direct")}>
          직접 입력
        </button>
        <button type="button" onClick={() => setTab("template")} className={tabClass(tab === "template")}>
          템플릿 참고하기
        </button>
      </div>

      {tab === "template" ? (
        <TemplateCatalog onPreview={setPreviewTemplate} />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* 적용된 템플릿 뱃지 — selectedTemplate 가 있을 때 입력 카드 위에 노출 */}
          {selectedTemplate && (
            <div className="mb-[10px] flex items-center justify-between bg-ac-s text-ac-d rounded-xl px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base leading-none" aria-hidden>{selectedTemplate.icon}</span>
                <span className="text-xs font-black truncate">
                  📋 {selectedTemplate.name} 템플릿 적용 중
                </span>
              </div>
              <button
                type="button"
                onClick={clearTemplateBadge}
                aria-label="템플릿 적용 해제"
                className="shrink-0 text-[11px] font-bold text-ac-d hover:underline cursor-pointer"
              >
                해제
              </button>
            </div>
          )}

          <div className="bg-sf border border-bd2 rounded-xl px-[18px] overflow-hidden">
            {/* Title */}
            <div className="py-4">
              <input
                {...register("title")}
                placeholder="할 일 제목을 입력하세요"
                maxLength={TITLE_MAX}
                className="w-full bg-transparent border-none outline-none text-base font-bold text-tx placeholder:text-mu2 placeholder:font-normal"
              />
              <div className="flex justify-between items-center mt-1 min-h-[14px]">
                <span className="text-[11px] text-rd font-medium">
                  {errors.title?.message ?? ""}
                </span>
                <span className="text-[11px] text-mu font-medium">
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
            </div>
            <div className="h-px bg-bd2" />

            {/* Description + File — AI 쪼개기 OFF 시 입력 잠금 */}
            <div
              className={[
                "py-[14px] transition-opacity",
                !wantSplit ? "opacity-50" : "",
              ].join(" ")}
              aria-disabled={!wantSplit}
            >
              <textarea
                {...register("description")}
                rows={2}
                readOnly={!wantSplit}
                placeholder={
                  wantSplit
                    ? "어떤 할 일이에요? AI에게 전달하고 싶은 말을 자유롭게 작성하세요.\n할 일을 설명하는 파일을 첨부해도 좋아요."
                    : "AI 쪼개기를 켜면 메모와 파일을 추가할 수 있어요."
                }
                className={[
                  "w-full bg-transparent border-none outline-none resize-none text-sm leading-[1.6] text-tx placeholder:text-mu2 placeholder:font-normal min-h-[78px]",
                  !wantSplit ? "cursor-not-allowed" : "",
                ].join(" ")}
              />

              <div className="mt-2">
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {files.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 bg-ac-s text-ac-d rounded-[10px] px-3 py-2 text-[13px] font-semibold"
                      >
                        <span className="truncate max-w-[200px]">📎 {f.name}</span>
                        <button
                          type="button"
                          onClick={() => onRemoveFile(i)}
                          disabled={!wantSplit}
                          aria-label={`${f.name} 제거`}
                          className="bg-transparent border-none text-ac-d font-extrabold text-sm px-1 leading-none enabled:cursor-pointer disabled:cursor-not-allowed"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {files.length < MAX_FILES && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <label
                      className={[
                        "inline-flex items-center gap-[6px] py-[6px] px-3 rounded-[10px] bg-fa transition-colors",
                        wantSplit ? "hover:bg-ac-s cursor-pointer" : "cursor-not-allowed",
                      ].join(" ")}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path
                          d="M14 10v2.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5V10M11.5 5L8 1.5 4.5 5M8 1.5V10"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-mu"
                        />
                      </svg>
                      <span className="text-xs text-tx2 font-semibold">파일 첨부</span>
                      <input
                        type="file"
                        hidden
                        multiple
                        disabled={!wantSplit}
                        accept={ACCEPTED_FILE_EXT.join(",")}
                        onChange={onAddFiles}
                      />
                    </label>
                    <span className="text-[11px] text-mu font-medium">
                      PDF · DOCX · TXT · MD · 이미지(PNG/JPG/WEBP) · 최대 {MAX_FILES}개(최대 5MB)
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="h-px bg-bd2" />

            {/* Dates */}
            <div className="py-3 flex gap-[10px] items-center">
              <div className="flex-1 flex items-center gap-[6px]">
                <span className="text-xs text-mu font-semibold whitespace-nowrap">시작</span>
                <input
                  type="date"
                  {...register("startDate")}
                  className="w-full bg-transparent border-none outline-none h-[38px] text-[13px] text-tx2"
                />
              </div>
              <span className="text-mu2 text-xs">~</span>
              <div className="flex-1 flex items-center gap-[6px]">
                <span className="text-xs text-mu font-semibold whitespace-nowrap">마감</span>
                <input
                  type="date"
                  {...register("dueDate")}
                  className="w-full bg-transparent border-none outline-none h-[38px] text-[13px] text-tx2"
                />
              </div>
            </div>
            <div className="h-px bg-bd2" />

            {/* AI 쪼개기 토글 */}
            <div className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-[6px]">
                <span className="text-[13px]">✦</span>
                <span className="text-sm font-bold text-tx">AI 쪼개기</span>
                <span className="text-[11px] text-mu font-medium">{wantSplit ? "ON" : "OFF"}</span>
              </div>
              <button
                type="button"
                onClick={() => setValue("wantSplit", !wantSplit, { shouldDirty: true })}
                aria-pressed={wantSplit}
                aria-label="AI 쪼개기 토글"
                className={[
                  "relative w-[46px] h-7 rounded-[14px] border-none flex-shrink-0 cursor-pointer transition-colors",
                  wantSplit ? "bg-ac" : "bg-bd",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute block w-[22px] h-[22px] rounded-full bg-white top-[3px] left-[3px]",
                    "shadow-[0_2px_5px_rgba(0,0,0,0.18)] transition-transform duration-[250ms] ease-[cubic-bezier(.4,0,.2,1)]",
                    wantSplit ? "translate-x-[18px]" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={[
              "mt-[14px] w-full border-none rounded-[14px] py-[17px] text-[15px] font-bold tracking-[-0.2px] cursor-pointer transition-all",
              "bg-gradient-to-b from-ac to-ac-d text-white",
              "shadow-[0_8px_20px_rgba(255,133,103,.35),inset_0_-3px_0_rgba(0,0,0,.08),inset_0_2px_0_rgba(255,255,255,.25)]",
              "active:scale-[.97] active:opacity-90",
            ].join(" ")}
          >
            할 일 추가하기
          </button>
        </form>
      )}

      {/* 미리보기 바텀시트 — previewTemplate 가 있을 때만 마운트 */}
      <TemplatePreviewSheet
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onStart={onStartTemplate}
      />
    </div>
  );
}

// §8.2 — 가로 스크롤 칩으로 카테고리를 토글한다 (프로토타입 .tpl-filter-row 패턴).
// 한 번에 하나만 활성. 첫 칩 "추천"은 featured=true 인 템플릿, "전체"는 16개 전부.
// 카드 클릭 시 onPreview 로 부모(HomePage)에 알리고, 미리보기 바텀시트는 부모가 띄운다.
type CatalogFilter = "featured" | "all" | TemplateCategory;

function TemplateCatalog({ onPreview }: { onPreview: (t: Template) => void }) {
  const [filter, setFilter] = useState<CatalogFilter>("featured");

  const chips: Array<{ id: CatalogFilter; label: string }> = [
    { id: "featured", label: "✦ 추천" },
    { id: "all", label: "전체" },
    ...CATEGORY_ORDER.map((cat) => ({
      id: cat as CatalogFilter,
      label: `${CATEGORY_META[cat].icon} ${CATEGORY_META[cat].label}`,
    })),
  ];

  let list: Template[];
  if (filter === "featured") {
    list = getFeaturedTemplates();
  } else if (filter === "all") {
    list = TEMPLATES;
  } else {
    list = getTemplatesByCategory(filter);
  }

  return (
    <div>
      {/* 카테고리 칩 행 — 가로 스크롤, 한 번에 하나만 활성 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((c) => {
          const active = filter === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={[
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap",
                active
                  ? "bg-ac text-white border border-ac"
                  : "bg-sf text-tx2 border border-bd hover:border-ac",
              ].join(" ")}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {list.map((t) => (
          <TemplateCard key={t.id} template={t} onSelect={onPreview} />
        ))}
      </div>

      <p className="mt-3 text-[11px] text-mu text-center leading-relaxed">
        템플릿을 골라 할 일을 쉽게 작성해보세요.
        <br />
        모든 항목은 자유롭게 수정할 수 있어요.
      </p>
    </div>
  );
}

function tabClass(active: boolean) {
  return [
    "flex-1 py-[9px] rounded-[9px] border-none",
    "text-[13px] font-bold cursor-pointer transition-all",
    active
      ? "bg-sf text-ac-d shadow-[0_1px_3px_rgba(0,0,0,.06)]"
      : "bg-transparent text-mu",
  ].join(" ");
}

