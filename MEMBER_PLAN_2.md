# 한발짝 · 팀원별 Phase 계획 v2 — 5/9 이후 최종 완성까지

**기간**: 2026-05-09(토) ~ 최종 완성 · _일 (팀에서 직접 결정)
**팀**: 재은 · 지희
**기준**: `MEMBER_PLAN.md` v1(5/8 완료분) + `설계/한발짝-프로세스설계.md` §0~§14 + 현재 코드베이스 상태

> **사용법**: PR이 머지될 때마다 해당 산출물의 `[ ]`를 `[x]`로 바꾸고 commit. v1과 동일한 방식.

---

## §0. 5/9 이후 — 무엇이 남아 있는가

### 5/8까지 완료된 것 (요약)

| 영역 | 상태 |
|---|---|
| 5탭 셸 + 라우팅 + 헤더 | 완료 |
| 홈 입력 (직접 입력) | 완료 (단일 파일 `HomePage.tsx`에 통합 구현) |
| AI 분해 백엔드 — DECOMPOSE 1차/2차 + VALIDATE + Prompt Cache | 완료 |
| Supabase 인증 + 세션 가드 | 완료 |
| 전체 탭 (목록 + 상세) | 완료 |
| 단계 체크 + 진행률 | 완료 |
| 타이머 + 헤더 "오늘 N분" | 완료 |
| Supabase 6테이블 + RLS | 완료 |

### Scope IN — 최종 완성까지 동작해야 하는 기능

| 영역 | 구현 깊이 | 담당 |
|---|---|---|
| 결과 4블록 UI 정식 분리 (`ResultPage` + 4개 block 컴포넌트) | 완전 | 재은 |
| StepCard 가이드 lazy-load + 3문장 템플릿(산출물·첫 동작·막힘 대응) | 완전 | 재은 |
| 2단계 쪼개기 프론트 UI (상세 화면 통합 + 하위 단계 박스 누적) | 완전 | 재은 |
| RefineBlock — "AI에게 직접 얘기" 피드백 입력 + 이전 버전 3개 히스토리 | 완전 | 재은 |
| 템플릿 카탈로그 — 8 카테고리 전부 + 미리보기 바텀시트 + structureHint 처리 | 완전 | 재은 |
| 첨부파일 업로드 + 텍스트 추출 (pdf · docx · txt · md · 이미지) | 완전 | 재은 |
| 분해 품질 회귀 케이스 정리 (프롬프트 보강 + few-shot 추가) | 완전 | 재은 |
| 프로젝트 인라인 편집 (단계 추가/삭제/제목 수정/순서 변경) | 완전 | 지희 |
| 캘린더 탭 — 주간/월간 뷰 + 단계 일정 배정(`schedule_assignments` CRUD) | 완전 | 지희 |
| 리포트 탭 — 4주 추이 + 프로젝트별 시간 분배 + 자동 코멘트 | 완전 | 지희 |
| 나(Me) 탭 — 누적 통계 + 완료 프로젝트 히스토리 | 완전 | 지희 |
| 모바일 폭 폴리싱 + 빈 상태 + 에러 처리 | 완전 | 지희 |
| 배포 — Vercel + Railway + Supabase prod | 완전 | 지희 |
| 통합 시연 회귀 + 발표 자료 보조 | 완전 | 페어 |

### Scope OUT — 본 계획에서 다루지 않는 영역

| 영역 | 사유 |
|---|---|
| 알림/푸시 | 본 capstone scope 외 |
| 모델 교체(Sonnet 4 / Opus) 비교 실험 | Haiku 4.5 품질 충분 시 보류 |

---

## §1. 분담 큰 그림

| 구역 | 담당 | Phase 코드 |
|---|---|---|
| 결과 4블록 정식 분리 + 가이드 lazy-load | **재은** | R6 |
| 2단계 쪼개기 프론트 UI | **재은** | R7 |
| RefineBlock 피드백 입력 + 버전 히스토리 | **재은** | R8 |
| 템플릿 카탈로그 8 카테고리 + structureHint | **재은** | R9 |
| 첨부파일 업로드 + 텍스트 추출 | **재은** | R10 |
| 분해 품질 회귀 케이스 + 프롬프트 보강 | **재은** | R11 |
| 프로젝트 인라인 편집 | **지희** | J7 |
| 캘린더 탭 (주간/월간 뷰 + 단계 일정 배정 + `schedule_assignments` CRUD) | **지희** | J8 |
| 리포트 탭 (집계 라우트 + 차트 UI + 자동 코멘트) | **지희** | J9 |
| 나(Me) 탭 — 누적 통계 + 히스토리 | **지희** | J10 |
| 모바일 폭 폴리싱 + 빈 상태 + 에러 처리 | **지희** | J11 |
| 배포 (Vercel + Railway + Supabase prod) | **지희** | J12 |
| 통합 시연 회귀 + 발표 자료 보조 | **페어** | P2 |

---

## §2. Phase 상세 — 재은

### R6. 결과 4블록 정식 분리 + 가이드 lazy-load — **재은**

| 항목 | 내용 |
|---|---|
| **작업일** | _일 |
| **선행 조건** | v1의 R4 완료 분량(현재 `HomePage.tsx`에 통합된 결과 뷰)을 별도 페이지로 추출 |
| **검증** | 입력→백엔드 호출→`/result`로 라우트 전환→4블록 표시. 단계 카드 펼침 시 가이드 lazy 표시. RefineBlock의 "더 잘게/더 크게" 그대로 동작 |
| **PR 브랜치** | `feat/result-page-split` |

**산출물**:
- [ ] `pages/ResultPage.tsx` (4블록 컨테이너 — 라우트 `/result` 또는 `/home/result` 분리)
- [ ] `components/result/ResultBlock.tsx` (단계 카드 리스트 + ✦ "AI가 N개 단계로 정리했어요" 뱃지)
- [ ] `components/result/StepCard.tsx` (접힘/펼침 + 번호 뱃지 + 예상 시간 뱃지)
- [ ] `components/result/StepGuide.tsx` (펼침 시 산출물·첫 동작·막힘 대응 3문장 박스)
- [ ] `components/result/ReasoningBlock.tsx` (💭 왜 이렇게 나눴어요? — analysis "무엇을 읽었는지" + "어떤 기준으로 나눴는지" 2섹션)
- [ ] `components/result/RefineBlock.tsx` (더 잘게/더 크게 두 칩 — 기존 동작 그대로 이식)
- [ ] `components/result/ConfirmBlock.tsx` (확정/직접 수정/쪼개지 않고 저장/돌아가기 4버튼)
- [ ] `HomePage.tsx`의 결과 뷰 분리 — 폼/로딩만 남김, 결과는 라우트 이동
- [ ] 가이드 lazy-load — `step.guide`가 비어 있으면 펼친 시점에 백엔드에서 보강(또는 분해 응답에 항상 포함되도록 프롬프트에서 강제)

### R7. 2단계 쪼개기 프론트 통합 — **재은**

| 항목 | 내용 |
|---|---|
| **작업일** | _일 |
| **선행 조건** | 백엔드 `POST /api/decompose/sub`는 v1에서 완료. 상세 화면(J4)도 완료 |
| **검증** | 상세 화면에서 단계의 "2단계 쪼개기" 클릭 → 3~5개 하위 단계가 박스로 누적 → 새로고침 후 유지. 하위 모두 완료 시 본 단계 자동 완료 |
| **PR 브랜치** | `feat/sub-decompose-ui` |

**산출물**:
- [ ] `components/detail/StepRow.tsx` 확장 — 하위 없는 단계에 "2단계 쪼개기" 버튼 노출
- [ ] `services/decompose.ts`에 `decomposeSub(parentStepId, ...)` 추가 — `/api/decompose/sub` 호출
- [ ] `components/detail/SubStepBox.tsx` (하위 리스트 박스 — 작은 번호 + 제목 + 상태 + "시작" + 완료 체크)
- [ ] `backend/src/routes/projects.ts`의 `GET /api/projects/:id`가 트리(`parent_step_id`) 형태로 반환하는지 점검 — 부족하면 보강
- [ ] 하위 단계 완료 → 본 단계 자동 완료(프론트 계산) + DB 동기화 로직
- [ ] 하위 단계가 있는 단계는 카드 액션 버튼이 "세부 단계 수정"으로 변경(§10.3.3)

### R8. RefineBlock 피드백 입력 + 이전 버전 히스토리 — **재은**

| 항목 | 내용 |
|---|---|
| **작업일** | _일 |
| **선행 조건** | R6 완료 |
| **검증** | "💬 AI에게 직접 얘기" 입력란에 "단계 3을 더 구체적으로" 입력 → 재분해 → 새 결과. "돌리기" 버튼으로 이전 버전 복원 가능. 최대 3개 버전 보관 |
| **PR 브랜치** | `feat/refine-feedback` |

**산출물**:
- [ ] `RefineBlock.tsx`에 피드백 textarea + 전송 버튼 추가
- [ ] `services/decompose.ts`에 `userFeedback` 인자 추가 → 백엔드 전달
- [ ] `backend/src/routes/decompose.ts`에서 `userFeedback`을 user 메시지에 동봉(prompt cache 접두부 영향 없도록 user 쪽에 배치)
- [ ] `useState<DecomposeResult[]>` 최대 3개 버전 보관 — `pushVersion`/`popVersion` 헬퍼
- [ ] "돌리기" 버튼 — 직전 버전으로 복원
- [ ] (선택) 시스템 프롬프트에 "사용자 피드백이 있을 때 반영 규칙" 명시

### R9. 템플릿 카탈로그 8 카테고리 + structureHint — **재은**

| 항목 | 내용 |
|---|---|
| **작업일** | _일 |
| **선행 조건** | v1의 3개 템플릿(학업·개발·글쓰기) 카탈로그가 동작 중인 상태에서 시작. 비어 있다면 R9 안에서 함께 구축 |
| **검증** | 8 카테고리(학업·개발·글쓰기·취업·창작·생활·여행·건강) 카드 그리드 표시. 카드 클릭 → 미리보기 바텀시트(아이콘+이름+규모/소요일+예시 5개+시작 버튼). "이 템플릿으로 시작" → 입력 폼 prefill + structureHint 백엔드 전달 |
| **PR 브랜치** | `feat/template-catalog` |

**산출물**:
- [ ] `services/templates.ts` — 8 카테고리 × 평균 2~3개 정적 배열 (§8.2 표 기준)
- [ ] `Template` 타입 — id, category, name, icon, summary, prefill, customFields, scaleHint, structureHint, previewChunks, featured
- [ ] `components/template/TemplateCard.tsx` — 카드 그리드 셀
- [ ] `components/template/TemplatePreviewSheet.tsx` — 바텀시트(§8.4)
- [ ] `pages/HomePage.tsx`의 "템플릿" 탭 — 카테고리 섹션 + 추천(featured) 영역
- [ ] 선택 시 InputForm prefill (제목·기간·메모 placeholder) + 템플릿 뱃지 표시
- [ ] `backend/src/prompts/decompose-system.ts`에 `structureHint`가 있을 때만 동적 user 메시지에 부착(접두부 캐시 보존)
- [ ] 결과 화면에 "📋 템플릿 기반" 출처 뱃지(§8.5)

### R10. 첨부파일 업로드 + 텍스트 추출 — **재은**

| 항목 | 내용 |
|---|---|
| **작업일** | _일 |
| **선행 조건** | R9 완료(입력 폼 안정화 후) |
| **검증** | pdf·docx·txt·md·png·jpg·webp·gif 최대 3개 업로드. 백엔드에서 텍스트 추출 → AI 입력에 결합. 추출 실패 시 사용자에게 알림 + 텍스트 입력으로 폴백 |
| **PR 브랜치** | `feat/attachments` |

**산출물**:
- [ ] `frontend` 측 — 폼에 파일 input 추가, 3개 제한, 형식 화이트리스트 (§3.2)
- [ ] `frontend/src/services/decompose.ts` — `multipart/form-data`로 파일 동봉
- [ ] `backend/src/routes/decompose.ts` — multer(또는 동급) 미들웨어로 파일 수신
- [ ] `backend/src/lib/extract.ts` — 형식별 추출
  - pdf: `pdf-parse` 또는 동급
  - docx: `mammoth`
  - txt/md: 그대로 읽기
  - 이미지: Anthropic 비전 입력으로 직접 첨부(텍스트 추출 단계 생략 가능) 또는 OCR
- [ ] 파일 크기 상한(예: 10MB) + 총합 상한(예: 20MB) — 초과 시 422
- [ ] INTAKE 단계에서 추출된 텍스트를 `rawText` 뒤에 결합 → DECOMPOSE 시스템 프롬프트는 변경 없음(접두부 캐시 보존)
- [ ] 의존성 추가: `multer`, `pdf-parse`, `mammoth` (사용자 확인 후)

### R11. 분해 품질 회귀 케이스 + 프롬프트 보강 — **재은**

| 항목 | 내용 |
|---|---|
| **작업일** | _일 |
| **선행 조건** | R6~R10 동작 |
| **검증** | 회귀 케이스 10~15개를 `backend/scripts/regression.ts`로 실행 → 각 케이스의 단계 수 · boundary_signal 분포 · 모호 동사 비율을 표로 출력. 90% 이상 케이스가 §1.2 가치(의미 우선·사용자 주도·설명 가능성)를 만족 |
| **PR 브랜치** | `feat/decompose-quality` |

**산출물**:
- [ ] `backend/scripts/regression-cases.json` — 입력 10~15개 (학업·개발·글쓰기·생활 혼합)
- [ ] `backend/scripts/regression.ts` — 각 케이스를 `/api/decompose`로 호출 → 응답 모음 → 통계 출력
- [ ] `backend/src/prompts/decompose-system.ts` 보강
  - 모호 동사 자동 리라이트 예시 1~2개 추가(§4.3)
  - 외부 대기 흡수 규칙 예시 추가(§5.2)
  - few-shot 1~2개 추가(석사 논문 예시 §6.1 활용)
- [ ] 회귀 결과 요약을 `docs/decompose-quality.md`에 기록

---

## §3. Phase 상세 — 지희

### J7. 프로젝트 인라인 편집 — **지희**

| 항목 | 내용 |
|---|---|
| **작업일** | _일 |
| **선행 조건** | v1의 J4(상세 화면) 완료 상태 |
| **검증** | 상세 하단 "수정하기" → 편집 모드 진입 → 단계 추가/삭제/제목 수정/순서 변경 → 저장 → DB에 새 `decompositions.round` 추가 + 신규 `steps` 세트 insert. 새로고침 후 유지. 이전 버전 3개까지 복원 가능 |
| **PR 브랜치** | `feat/project-edit` |

**산출물**:
- [ ] `pages/ProjectDetailPage.tsx`에 편집 모드 토글 상태
- [ ] `components/detail/StepEditor.tsx` (제목 input + 삭제 버튼 + 드래그 핸들)
- [ ] 드래그 순서 변경 — `@dnd-kit/sortable` 또는 동급(사용자 확인 후 추가)
- [ ] `backend/src/routes/projects.ts`에 `PATCH /api/projects/:id/steps` 또는 `POST /api/projects/:id/decompositions` — 새 round로 저장
- [ ] `backend/src/schemas/project.ts`에 `EditStepsSchema` 추가
- [ ] 이전 버전 복원 — `GET /api/projects/:id?round=N` 또는 별도 엔드포인트
- [ ] 진행률은 최신 round의 done 비율 기준
- [ ] 편집 중 단계 추가 시 임시 id(`tmp-1` 등) 부여, 저장 시 백엔드에서 `s1, s2, ...` 재발급

### J8. 캘린더 탭 — **지희**

| 항목 | 내용 |
|---|---|
| **작업일** | _일 |
| **선행 조건** | v1의 J1(`schedule_assignments` 테이블 + RLS)만으로 충분. 프로젝트 상세(J4) 단계에서 일정 배정 UI를 호출 |
| **검증** | /calendar 진입 → 주간/월간 토글. 주간: 7일 스트립 + 선택 날짜의 단계 카드 + ▲/▼로 우선순위 변경. 월간: 7×6 그리드 + 프로젝트 색상 칩 + 마감일 D-Day. 상세 화면에서 단계를 날짜에 배정 → 해당 날짜에 카드 표시. 새로고침 후 유지 |
| **PR 브랜치** | `feat/calendar-tab` |

**산출물**:
- [ ] `backend/src/schemas/calendar.ts` — `ScheduleAssignmentSchema` zod 정의
- [ ] `backend/src/routes/calendar.ts` — `GET /api/calendar?from&to` (범위 조회) · `POST /api/calendar` (배정 생성) · `PATCH /api/calendar/:id` (날짜·우선순위 변경) · `DELETE /api/calendar/:id`
- [ ] `pages/CalendarPage.tsx` — 주간/월간 토글 컨테이너(세그먼트 컨트롤, 뷰 상태는 세션 내 유지)
- [ ] `components/calendar/WeekStrip.tsx` — 7일 스트립(요일명 + 날짜 원형, 오늘 주황 강조, 선택일 검정 배경) + "오늘로 이동" 버튼
- [ ] `components/calendar/DayList.tsx` — 선택 날짜의 단계 카드 리스트(프로젝트 아이콘 + 단계 제목 + 프로젝트명 + ▲/▼ 우선순위 버튼)
- [ ] `components/calendar/MonthGrid.tsx` — 7×6 그리드 + 프로젝트 색상 칩(3개 초과 시 "+N개") + 마감일 D-Day 뱃지 + 이전/다음 달 화살표
- [ ] `components/detail/AssignDateButton.tsx` — 프로젝트 상세의 단계 카드에 날짜 배정 버튼(date picker 또는 미니 캘린더 팝오버) → `POST /api/calendar`
- [ ] `frontend/src/services/calendar.ts` — list/create/patch/delete API 호출 함수
- [ ] `backend/src/index.ts`에 `/api/calendar` 라우트 연결
- [ ] 프로젝트 색상은 `projects.color` 그대로 사용(§14.3)
- [ ] 빈 상태 — 선택 날짜에 배정된 단계가 0이면 "이 날짜에 배정된 할 일이 없어요"

### J9. 리포트 탭 — **지희**

| 항목 | 내용 |
|---|---|
| **작업일** | _일 |
| **선행 조건** | v1의 단계 체크(J5) + 타이머(J6) 완료 — 시간 데이터가 쌓여 있어야 의미 있음 |
| **검증** | /report 진입 → 4주 추이 막대 그래프 + 이번 주 하이라이트 + 프로젝트별 시간 분배 바 + "잘한 점/아쉬운 점" 자동 코멘트. 데이터 없을 시 빈 상태 |
| **PR 브랜치** | `feat/report-tab` |

**산출물**:
- [ ] `backend/src/routes/report.ts` — `GET /api/report/weekly` (집계 쿼리: steps.time_spent · done · 프로젝트 그룹핑)
- [ ] `pages/ReportPage.tsx` 컨테이너
- [ ] `components/report/WeeklySummary.tsx` — 4주 막대 그래프 (recharts)
- [ ] `components/report/ProjectBreakdown.tsx` — 프로젝트별 시간 분배 바 + 완료율 (§12.4)
- [ ] `components/report/AutoComment.tsx` — 규칙 기반 잘한 점/아쉬운 점
  - "3일 연속 집중" → 칭찬
  - "주중 갭 24h 이상" → 격려
  - "이번 주 집중 시간 0분" → 빈 상태 메시지
- [ ] 의존성 추가: `recharts` (사용자 확인 후)
- [ ] 빈 상태 — "기록이 쌓이면 여기에 표시돼요"

### J10. 나(Me) 탭 — 누적 통계 + 히스토리 — **지희**

| 항목 | 내용 |
|---|---|
| **작업일** | _일 |
| **선행 조건** | v1의 인증(J2) 완료 상태에서 MePage placeholder + 로그아웃만 있음 |
| **검증** | /me 진입 → 누적 통계(총 완료 수 · 총 집중 시간 · 연속 일수) + 완료된 프로젝트 아코디언. 로그아웃 버튼 유지 |
| **PR 브랜치** | `feat/me-tab` |

**산출물**:
- [ ] `backend/src/routes/me.ts`에 `GET /api/me/stats` 추가 — 총 완료 수 · 총 time_spent · streak(연속 일수) 계산
- [ ] `pages/MePage.tsx` 확장 — 통계 카드 + 히스토리 아코디언
- [ ] `components/me/StatsCard.tsx` (3개 큰 숫자 카드)
- [ ] `components/me/CompletedProjectList.tsx` — 진행률 100% 프로젝트만 아코디언으로 표시
- [ ] streak 계산 로직 — `steps.updated_at`(또는 별도 컬럼)을 일자별 그룹핑

### J11. 모바일 폭 폴리싱 + 빈 상태 + 에러 처리 — **지희**

| 항목 | 내용 |
|---|---|
| **작업일** | _일 |
| **선행 조건** | R6~R10, J7~J10 대부분 완료 |
| **검증** | 모바일(≤767px) · 태블릿(768~1023px) · 데스크탑(≥1024px)에서 모든 화면이 깨지지 않음. 네트워크 실패 · 422 · 401 각 케이스에서 사용자 친화 메시지 표시 |
| **PR 브랜치** | `feat/mobile-polish` |

**산출물**:
- [ ] 전 화면 모바일 폭 audit (Home · Result · All · Detail · Timer · Calendar · Report · Me · Login)
- [ ] 빈 상태 컴포넌트 통일 (`components/EmptyState.tsx`) — 이모지 + 타이틀 + 안내
- [ ] 에러 바운더리 (`components/ErrorBoundary.tsx`) — 라우트 단위
- [ ] `services/*.ts` 공통 에러 변환 — fetch 실패/422/401 분기
- [ ] Toast(또는 banner) — 에러/성공 알림 통일
- [ ] 로딩 스피너 통일 (INTAKE→DECOMPOSE→VALIDATE→PRESENT 4단 progress §3.2 마무리)

### J12. 배포 — **지희**

| 항목 | 내용 |
|---|---|
| **작업일** | _일 |
| **선행 조건** | 모든 기능 phase 완료, 통합 시연(P2) 1차 통과 |
| **검증** | 공개 URL에서 회원가입→로그인→입력→분해→확정→상세→체크→타이머→리포트 한 사이클 통과. 모바일에서도 동일 |
| **PR 브랜치** | `chore/deploy` |

**산출물**:
- [ ] Vercel 프론트 배포 — Root `frontend`, env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`
- [ ] Railway 백엔드 배포 — Root `backend`, Start `npm run start`, env: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_ORIGIN`
- [ ] Supabase prod — RLS 활성 재확인, Auth Site URL/Redirect URL을 Vercel 도메인으로 설정
- [ ] CORS 화이트리스트 — Vercel 도메인만 허용
- [ ] `frontend/src/services`의 baseURL을 `import.meta.env.VITE_API_BASE_URL`로 통일(하드코딩 제거)
- [ ] 배포 후 health 체크 라우트 — `GET /api/health` 200 응답 확인
- [ ] README에 배포 URL · 환경변수 표 정리

---

## §4. Phase 상세 — 페어

### P2. 통합 시연 회귀 + 발표 자료 보조 — **페어**

| 항목 | 내용 |
|---|---|
| **작업일** | _일 |
| **선행 조건** | R6~R11, J7~J11 머지 완료 |
| **검증** | 아래 시연 시나리오가 끊김 없이 통과. 발표용 30초 시연 영상 + 슬라이드 보조 자료 준비 |
| **PR 브랜치** | `chore/demo-prep` (필요 시) |

**시연 시나리오**:

```
1. 회원가입 → 로그인
2. 홈 → 직접 입력 → "AI 할 일 분해 서비스 석사 논문 쓰기, 6개월 마감"
   (또는) 홈 → 템플릿 → "학업 · 기말 레포트 작성" 선택 → prefill 확인
3. 첨부파일 1개(요구사항 pdf) 업로드 → 추출 확인
4. 5~10초 로딩 → /result 4블록 결과
5. ResultBlock에서 첫 단계 펼쳐 가이드(산출물·첫 동작·막힘 대응) 확인
6. ReasoningBlock 펼쳐 추론 확인
7. RefineBlock에서 "더 잘게" 한 번 → 단계 수 증가, "돌리기"로 이전 버전 복원
8. ConfirmBlock의 "확정하기" → /all 자동 이동
9. 카드 클릭 → 상세 진입 → 첫 단계 체크 → 진행률 갱신
10. 다른 단계의 "2단계 쪼개기" → 하위 3~5개 박스 표시 → 하위 하나 체크
11. 단계 "시작" → 타이머 25분(시연용 30초) → 종료 → 헤더 "오늘 N분" 갱신
12. 상세에서 다음 단계를 내일 날짜에 배정 → /calendar 주간 뷰에서 해당 날짜에 카드 표시 → 월간 뷰 토글 시 색상 칩 + D-Day 확인
13. 상세 하단 "수정하기" → 단계 한 개 추가 → 순서 변경 → 저장
14. /report → 4주 추이 + 자동 코멘트 확인
15. /me → 누적 통계 + 완료 프로젝트 히스토리 확인
16. 새로고침 → 모든 데이터 유지
```

**산출물**:
- [ ] 시연 시나리오 1회 페어 회귀 (위 15스텝)
- [ ] 발견된 버그를 GitHub Issue로 등록 → 담당자 분배
- [ ] 30초 시연 영상(화면 녹화) — 발표 슬라이드 임베드용
- [ ] 발표 슬라이드 보조 자료(스크린샷·아키텍처 다이어그램 갱신본) — `설계/한발짝-발표자료-최종-v3.pptx` 업데이트

---

## §5. 진행 현황 한눈에

각 Phase의 산출물 체크박스를 매일 확인. 채워지지 않은 항목이 다음 일정으로 넘어가면 즉시 sync에서 알리기. v1과 동일.

### 진행률 빠르게 보기

```bash
grep -c "\[x\]" MEMBER_PLAN_2.md   # 완료 산출물 수
grep -c "\[ \]" MEMBER_PLAN_2.md   # 미완 산출물 수
```

### Phase별 완료 기준

각 Phase가 "끝났다"의 정의: **해당 산출물 박스 100% [x]** + **PR이 main에 머지됨**.

---

## §6. 작업 산출물 합계 (예상 추가 파일)

| 영역 | 추가 파일 수 (approx) | 주요 파일 |
|---|---|---|
| `frontend/src/pages/` | ~1 | ResultPage |
| `frontend/src/components/result/` | ~6 | ResultBlock, StepCard, StepGuide, ReasoningBlock, RefineBlock, ConfirmBlock |
| `frontend/src/components/detail/` | ~2 | SubStepBox, StepEditor |
| `frontend/src/components/template/` | ~2 | TemplateCard, TemplatePreviewSheet |
| `frontend/src/components/calendar/` | ~3 | WeekStrip, DayList, MonthGrid |
| `frontend/src/components/report/` | ~3 | WeeklySummary, ProjectBreakdown, AutoComment |
| `frontend/src/components/me/` | ~2 | StatsCard, CompletedProjectList |
| `frontend/src/components/` (공용) | ~2 | EmptyState, ErrorBoundary |
| `frontend/src/services/` | ~4 | templates, calendar, report, me/stats (또는 기존 확장) |
| `backend/src/routes/` | ~2 | calendar, report (me/stats는 me.ts 확장) |
| `backend/src/schemas/` | ~1 | calendar |
| `backend/src/lib/` | ~1 | extract (파일 텍스트 추출) |
| `backend/scripts/` | ~2 | regression-cases.json, regression.ts |
| `docs/` | ~1 | decompose-quality.md |

---

## §7. 매일 확인할 한 가지

**"오늘 끝낼 phase의 산출물 박스가 모두 [x]로 채워졌는가?"** v1과 동일. 매 작업 끝에 본인 phase 표 펴서 점검. 채워지지 않은 박스가 있으면 다음 날 첫 작업으로 끌고 가지 말고, 즉시 sync에서 알리고 일정 재조정.

---

## §8. v1과의 차이 한 줄 요약

| 영역 | v1 (~5/8) | v2 (5/9~) |
|---|---|---|
| 결과 UI | HomePage 통합 | ResultPage로 분리 + 4블록 컴포넌트 정식 분할 |
| 가이드라인 | 본문에 노출 | lazy-load + 3문장 템플릿 |
| 2차 분해 | 백엔드만 | 상세 화면 UI 통합 |
| 재분해 | 더 잘게/더 크게 두 버튼 | 피드백 입력 + 이전 버전 3개 히스토리 |
| 템플릿 | 3개 카탈로그 검증 | 8 카테고리 전부 + 미리보기 바텀시트 |
| 첨부 | 텍스트 입력으로 우회 | pdf · docx · 이미지 등 추출 결합 |
| 편집 | 삭제·재생성으로 우회 | 인라인 단계 편집 + round 버전 저장 |
| 캘린더 | 미구현(보조 기능으로 미룸) | 주간/월간 뷰 + 단계 일정 배정(`schedule_assignments` CRUD) |
| 리포트 | 미구현 | 4주 추이 · 프로젝트별 시간 · 자동 코멘트 |
| 나(Me) | 로그아웃만 | 누적 통계 + 완료 히스토리 |
| 모바일 | 데스크탑 우선 | 전 화면 폭 폴리싱 |
| 배포 | 로컬만 | Vercel + Railway + Supabase prod |

---

*— 최종 완성까지 phase 계획 v2 · 2026.05.09*
