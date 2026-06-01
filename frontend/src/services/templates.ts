// 설계 §8 — 템플릿 카탈로그.
// "쪼개고 싶은 확률이 높은 작업"만 추린다 — 시작이 막막하고, 작업이 크고, 결정 부담이 큰 일.
//
// AI 가 받아가는 정보는 단 두 줄기:
//   1) structureHint — "이 도메인은 보통 이런 흐름으로 끊는다" 분해 가이드 (설계자가 작성)
//   2) memo (customFields placeholder + 사용자가 채운 답) — 이번 사용자의 구체 변수
// 둘 다 백엔드 user 메시지의 "# 템플릿 힌트" / "# 상세 메모" 섹션으로 흘러간다.
// 시스템 프롬프트(접두부 캐시)는 건드리지 않는다.
//
// previewChunks 는 UI 전용 — AI 에 전달되지 않는다. 짧은 흐름 노드(2~5단어)로 둬서
// "어떤 종류의 일인지" 감만 전달하고, 실제 분해 결과와 어긋날 때의 실망감을 줄인다.

export interface Template {
  id: string;                    // 예: "study-exam"
  category: TemplateCategory;    // 카테고리 키 (한국어 표기는 CATEGORY_META 참조)
  name: string;                  // 예: "시험 공부"
  icon: string;                  // 이모지
  customFields: string[];        // 메모 placeholder — 사용자가 답을 채우면 그게 AI 에게 가장 큰 영향을 준다.
  structureHint: string;         // AI 의 분해 가이드(동적 user 메시지로 전달)
  previewChunks: string[];       // 바텀시트 미리보기용 흐름 노드 4~5개 (짧은 명사구)
  featured?: boolean;            // 홈 상단 "추천" 칩에 노출 여부
}

export type TemplateCategory =
  | "study"
  | "work"
  | "career"
  | "life"
  | "leisure";

export const CATEGORY_META: Record<TemplateCategory, { label: string; icon: string }> = {
  study: { label: "학업", icon: "📚" },
  work: { label: "업무", icon: "💼" },
  career: { label: "취업", icon: "🎯" },
  life: { label: "생활", icon: "🏠" },
  leisure: { label: "여가", icon: "✈️" },
};

export const CATEGORY_ORDER: TemplateCategory[] = [
  "study", "work", "career", "life", "leisure",
];

// 메모 placeholder 로 합칠 때 사용. 빈 줄이면 안내가 잘 보이도록 줄바꿈으로 잇는다.
export function joinCustomFieldsAsMemo(fields: string[]): string {
  return fields.filter((f) => f.trim().length > 0).join("\n");
}

export const TEMPLATES: Template[] = [
  // ── 학업 ─────────────────────────────────────────────
  {
    id: "study-exam",
    category: "study",
    name: "시험 공부",
    icon: "📝",
    customFields: [
      "- 시험 범위:",
      "- 현재까지 진행도 (전혀 안 봄 / 1회독 중 등):",
      "- 약한 파트:",
    ],
    structureHint:
      "시험 준비는 범위 파악 → 개념 정리 → 문제풀이 → 약점 보강 → 모의/총정리 흐름이다. 챕터·주제 단위로 끊되, 마지막 단계는 시간 박스(전체 회독·모의 풀이)로 강하게 닫는다. D-day 가 짧으면 개념 정리 phase 를 압축하고 기출·약점 phase 에 비중을 둔다. 약한 단원이 명시되면 별도 단계로 분리한다.",
    previewChunks: ["범위 파악", "개념 정리", "문제풀이", "약점 보강", "모의 풀이"],
    featured: true,
  },
  {
    id: "study-assignment",
    category: "study",
    name: "과제",
    icon: "📔",
    customFields: [
      "- 과제 종류 (글쓰기 / 계산 / 조별 등):",
      "- 분량·형식:",
      "- 핵심 요구사항 한 줄 (출제자가 강조한 것):"
    ],
    structureHint:
      "과제는 요구사항 분석 → 자료/재료 모으기 → 본 작업 → 다듬기 → 제출 흐름이다. 종류(코딩/계산/글쓰기/실험)에 따라 본 작업 단계의 mode 가 달라지므로 customFields 의 종류를 보고 그에 맞춰 분해하라. 조별이면 dependency 신호가 강해 통합·점검 단계를 별도로 둔다.",
    previewChunks: ["요구사항 분석", "자료 모으기", "본 작업", "다듬기", "제출"],
  },
  {
    id: "study-certification",
    category: "study",
    name: "자격증 준비",
    icon: "🎓",
    customFields: [
      "- 과목 구성과 출제 비중:",
      "- 시작 시점의 베이스 (기초 있음 / 노베이스 등):",
    ],
    structureHint:
      "자격증 준비는 시험일 역산 → 과목별 진도 → 기출 회독 → 약점 보강 → 시험 전 점검 흐름이다. dependency(과목 간 선후)와 phase(이론→기출→마무리)가 강한 경계다. 베이스가 없으면 개념 정리 phase 비중을 크게, 베이스가 있으면 기출 회독·약점 보강에 비중을 둔다. 출제 비중이 높은 과목을 우선 배치한다.",
    previewChunks: ["시험·과목 파악", "교재 1회독", "기출 회독", "약점 보강", "시험 전 점검"],
    featured: true,
  },
  {
    id: "study-report",
    category: "study",
    name: "레포트·소논문",
    icon: "📚",
    customFields: [
      "- 주제 상태 (정해짐 / 자유 선택 등):",
      "- 핵심 질문·주장 (있다면 한 줄):",
      "- 분량·형식 (페이지·자수, 인용 규칙):",
    ],
    structureHint:
      "레포트·소논문은 주제·질문 정의 → 자료 조사 → 개요 → 본문 초안 → 다듬기 → 인용·점검 → 제출 흐름이다. artifact(개요·초안·완성본)에 강한 의미 경계가 있다. 분량이 클수록 본문은 절(섹션) 단위로 더 잘게 끊는다.",
    previewChunks: ["주제 잡기", "자료 조사", "개요 짜기", "본문 초안", "다듬어 제출"],
  },

  // ── 업무 ─────────────────────────────────────────────
  {
    id: "work-side-project",
    category: "work",
    name: "사이드 프로젝트",
    icon: "🛠️",
    customFields: [
      "- 종류 (코딩 / 디자인 / 콘텐츠 / 기타):",
      "- 꼭 들어가야 할 핵심 기능·산출물:",
    ],
    structureHint:
      "사이드 프로젝트는 기획 → 설계 → MVP 구현 → 공개·배포 → 다듬기 흐름이다. mode 전환(생각하기/만들기/내보내기)이 강한 경계. 종류에 따라 구현 단계의 입자도가 다르므로 customFields 의 종류와 핵심 기능을 보고 분해하라. 미정인 부분이 많으면 의사결정을 작게 분리한다.",
    previewChunks: ["한 줄 정의", "구조 스케치", "코어 구현", "공개·배포", "써보며 다듬기"],
    featured: true,
  },
  {
    id: "work-presentation",
    category: "work",
    name: "발표 준비",
    icon: "🎤",
    customFields: [
      "- 발표 종류 (수업 / 회의 / 세미나 등):",
      "- 청중 (전문성·관심사):",
      "- 발표 시간과 형식:",
    ],
    structureHint:
      "발표 준비는 메시지 정의 → 슬라이드 구조 → 슬라이드 제작 → 스크립트 → 리허설 흐름이 좋다. artifact(개요·슬라이드·스크립트)와 mode 전환(만들기→연습)에 강한 경계가 있다. 마지막 단계는 시간 박스(리허설)로 강하게 닫는다. 청중 전문성에 따라 메시지 깊이를 조정한다.",
    previewChunks: ["메시지 정하기", "흐름 잡기", "슬라이드 제작", "스크립트", "리허설"],
    featured: true,
  },
  {
    id: "work-meeting-prep",
    category: "work",
    name: "회의 준비",
    icon: "📋",
    customFields: [
      "- 회의 종류 (팀 정기 / 워크숍 / 고객 미팅 등):",
      "- 회의 시간 (15분 / 30분 / 1시간 등):",
      "- 나의 역할:",
      "- 회의가 도출할 결과 (결정·합의·다음 액션 등):",
    ],
    structureHint:
      "회의 준비는 목적·결정사항 정의 → 아젠다 → 자료 준비 → 사전 공유 → 직전 점검 흐름이다. 시간 박스가 짧으므로 '도착해야 할 결정'을 명확히 두는 것이 핵심. 회의 시간이 짧을수록(15~30분) 단계를 더 작게, 길수록(워크숍·반나절+) 자료 준비·사전 공유 phase 비중을 키운다. 너무 잘게 쪼개지 마라.",
    previewChunks: ["결정사항 정의", "아젠다", "자료 준비", "사전 공유", "직전 점검"],
  },
  {
    id: "work-meeting-notes",
    category: "work",
    name: "회의록 작성",
    icon: "✏️",
    customFields: [
      "- 다룬 안건:",
      "- 메모·녹취 여부:",
    ],
    structureHint:
      "회의록은 메모 정리 → 결정사항 추리기 → 액션 아이템과 담당자·기한 → 본문 다듬기 → 공유 흐름이다. artifact(결정·액션)가 가장 강한 경계라 그 두 항목을 본문에서 따로 빼서 정리한다. 메모가 단편적이면 정리 phase 비중을 크게, 잘 정리돼 있으면 결정·액션 추리기에 비중을 둔다.",
    previewChunks: ["메모 정리", "결정 추리기", "액션 아이템", "본문 다듬기", "공유"],
  },
  {
    id: "work-document",
    category: "work",
    name: "문서 작업",
    icon: "📑",
    customFields: [
      "- 종류 (보고서 / 제안서 / 매뉴얼 / 기획서 등):",
      "- 핵심 메시지·결론 한 줄:",
    ],
    structureHint:
      "업무 문서는 목적·결론 정의 → 자료·근거 모으기 → 목차 → 초안 → 다듬기 → 검토·공유 흐름이다. 결론을 먼저 정하고 본문은 그것을 뒷받침하는 방향으로 분해한다.",
    previewChunks: ["결론 정하기", "자료 모으기", "목차", "초안", "다듬어 공유"],
    featured: true,
  },

  // ── 취업 ─────────────────────────────────────────────
  {
    id: "career-interview",
    category: "career",
    name: "면접 준비",
    icon: "🗣️",
    customFields: [
      "- 면접 형식 (인성 / 직무 / 기술 / PT / 그룹):",
      "- 약하다고 느끼는 영역:",
    ],
    structureHint:
      "면접 준비는 회사 리서치 → 예상 질문 정리 → 답변 작성 → 혼자 연습 → 모의 면접 흐름이다. mode 전환(만들기→연습)이 강한 경계라 두 phase 를 따로 둔다. 마지막은 시간 박스(모의 면접)로 강하게 닫는다. PT 면접이면 발표 준비 흐름이 추가된다. 약점 영역은 별도 단계로 분리해 보강한다.",
    previewChunks: ["회사 리서치", "예상 질문", "답변 작성", "혼자 연습", "모의 면접"],
  },
  {
    id: "career-cover-letter",
    category: "career",
    name: "자기소개서",
    icon: "🧑‍💼",
    customFields: [
      "- 문항 구성 (예: 지원동기 500자):",
    ],
    structureHint:
      "자기소개서는 경험 정리 → 문항 분석 → 경험·문항 매핑 → 문항별 초안 → 다듬기 흐름이다. 문항 단위로 의미가 다르므로 문항별로 끊는다. 같은 경험을 여러 문항에 재활용할 때는 강조점을 다르게 잡는 단계를 분리한다.",
    previewChunks: ["회사·JD 분석", "경험 정리", "문항 매핑", "문항별 초안", "톤 다듬기"],
    featured: true,
  },
  {
    id: "career-exam",
    category: "career",
    name: "채용 시험 준비",
    icon: "📊",
    customFields: [
      "- 시험 과목과 출제 비중:",
      "- 현재 진행도 (1회독 끝 / 기출 풀이 중 등):",
      "- 약한 과목·파트:",
    ],
    structureHint:
      "채용 시험은 시험일 역산 → 과목별 진도 → 기출 회독 → 약점 보강 → 모의·최종 점검 흐름이다. dependency(과목 간 선후)와 phase(이론→기출→마무리)가 강한 경계다. 시험까지 남은 일수와 현재 진행도가 phase 비율을 결정한다. 장기 사이클이므로 1차 단계는 phase 로 크게 잡고 자식 단계로 세분화한다.",
    previewChunks: ["시험 분석", "과목 진도", "기출 회독", "약점 보강", "모의·점검"],
  },
  {
    id: "career-portfolio-resume",
    category: "career",
    name: "경력기술서·포트폴리오 정리",
    icon: "📁",
    customFields: [
      "- 담을 프로젝트·작업물 후보:",
      "- 각 프로젝트에서 내 역할:",
      "- 형식 (PDF / 웹 / 노션 등):",
    ],
    structureHint:
      "경력기술서·포트폴리오는 경력 인벤토리 → 직무 매핑 → 케이스 스터디 작성 → 디자인·통일 → 출력 흐름이다. 케이스마다 역할·결과·배움을 떼어 쓰는 단계를 별도로 두면 막힘이 적다. artifact(인벤토리·각 케이스·최종본)가 강한 경계.",
    previewChunks: ["경력 인벤토리", "직무 매핑", "케이스별 작성", "디자인 통일", "출력"],
  },

  // ── 생활 ─────────────────────────────────────────────
  {
    id: "life-tax",
    category: "life",
    name: "연말 정산",
    icon: "🧾",
    customFields: [
      "- 회사 정산 방식 (홈택스 자동 / 직접 입력 / 세무사 대행):",
      "- 유의할 공제 항목 (의료비·교육비·기부·월세·청약·연금저축 등):",
    ],
    structureHint:
      "연말 정산은 서류 수집 → 공제 항목 점검 → 자료 입력·매칭 → 검토 → 제출 흐름이다. dependency(자료 모으기 → 입력 → 검토)와 artifact(영수증·증빙·신고서)가 강한 경계. 빠뜨리기 쉬운 공제 항목을 별도 단계로 두면 부담이 줄어든다.",
    previewChunks: ["서류 종류 정리", "자료 다운로드", "추가 영수증", "공제 매칭", "검토·제출"],
  },

  // ── 여가 ─────────────────────────────────────────────
  {
    id: "leisure-travel",
    category: "leisure",
    name: "여행 준비",
    icon: "✈️",
    customFields: [
      "- 국내 / 해외 (해외면 비자·환전 여부):",
      "- 여행 스타일 (자유 / 패키지 / 한 곳 깊게 / 여러 곳 훑기):",
      "- 꼭 하고 싶은 것·먹고 싶은 것:",
    ],
    structureHint:
      "여행 준비는 목적지·기간 결정 → 항공·교통 예약 → 숙소 예약 → 동선·활동 → 짐 흐름이다. dependency(항공 → 숙소 → 일정)와 decision(어디로·얼마)이 강한 경계. 해외면 비자·환전·로밍·발권 단계가 통째로 추가되고, 국내면 항공 phase 자체가 없거나 작다. 장기·해외일수록 결정 부담이 커지므로 의사결정 단위로 분리한다.",
    previewChunks: ["목적지·일정", "항공 예약", "숙소 예약", "동선·활동", "짐·발권"],
  },
];

export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return TEMPLATES.filter((t) => t.category === category);
}

export function getFeaturedTemplates(): Template[] {
  return TEMPLATES.filter((t) => t.featured);
}

export function findTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
