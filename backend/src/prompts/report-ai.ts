// 리포트 탭 AI 인사이트 생성 프롬프트
// POST /api/report/ai-summary 단일 호출용
// 동적 데이터(weeksText, projectsText, timeContext)는 user 메시지로만 주입한다.

export function buildReportUserPrompt({
  weeksText,
  projectsText,
  timeContext,
}: {
  weeksText: string;
  projectsText: string;
  timeContext: string;
}): string {
  return `사용자의 이번 주 활동 데이터입니다.

## 4주 추이
${weeksText}

## 프로젝트 현황
${projectsText}

## 시간대
${timeContext}

위 데이터를 바탕으로 "자기이해형 리포트"를 JSON으로 작성해주세요.
평가가 아닌 관찰 톤으로, 따뜻하고 친근하게 작성해주세요.

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "headline": "이번 주를 한 문장으로 요약 (20자 이내)",
  "goods": ["잘한 점 1", "잘한 점 2"],
  "bads": ["아쉬운 점 1"],
  "userType": {
    "type": "작업 스타일 이름 (10자 이내)",
    "emoji": "이모지 1개",
    "reason": "왜 이 스타일인지 근거 포함 설명 (2문장 이내)"
  },
  "patterns": [
    { "emoji": "이모지", "title": "패턴 제목", "body": "구체적 관찰 내용 (1~2문장)" }
  ],
  "projectFlows": {
    "프로젝트명": "흐름 상태 한 줄 (예: 안정적으로 진행 중, 마감 압박 진입)"
  },
  "strategies": ["행동 전략 1", "행동 전략 2", "행동 전략 3"]
}`;
}
