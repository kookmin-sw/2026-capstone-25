# 한발짝 · 팀원별 Phase 계획

**기간**: 2026-04-29 (수) ~ 2026-05-08 (금) · 10일
**팀**: 재은 · 지희
**기준**: `설계/hanbaljjak_v12.html` 프로토타입 + `설계/한발짝-프로세스설계.md` §0~§14

> **사용법**: PR이 머지될 때마다 해당 산출물의 `[ ]`를 `[x]`로 바꾸고 commit. 진행 상황이 한눈에 보인다.

---

## §0. 5/8까지의 목표 — 무엇을 구현하는가

### Scope IN — 5/8까지 동작해야 하는 기능

| 영역 | 구현 깊이 |
|---|---|
| 5탭 셸 + 라우팅 + 헤더 | 완전 |
| 홈 입력 (직접 입력) | 완전 |
| 홈 입력 (템플릿) | 카탈로그 + 3개 하드코딩 |
| AI 분해 백엔드 (DECOMPOSE) | 완전 + Prompt Cache + VALIDATE(분해 성립·id 유일성) + 1차/2차 분해 라우트 |
| 결과 4블록 UI | 완전 (Refine은 "더 잘게/더 크게" 두 버튼만) |
| 확정 → DB 저장 | 완전 |
| Supabase 인증 | 완전 (Email + Password) |
| 전체 탭 (목록 + 상세) | 완전 |
| 단계 체크 + 진행률 갱신 | 완전 |
| 타이머 (단순 카운트다운) | 완전 |
| 헤더 "오늘 N분" 필 | 완전 |

### Scope OUT — 5/9 이후로 미루는 기능 (고도화 단계)

| 영역 | 사유 |
|---|---|
| 2단계 쪼개기 (subChunks) | 1차 분해 안정화 후 |
| 가이드라인 lazy-load + 3문장 템플릿 | UI 폴리싱 단계에서 |
| RefineBlock 피드백 입력 ("AI에게 직접 얘기") | 더 잘게/더 크게로 충분 |
| 캘린더 탭 | 보조 기능 |
| 리포트 탭 | 보조 기능 |
| 8개 템플릿 전부 | 3개로 카탈로그 검증 |
| 첨부파일 업로드 | 텍스트 입력으로 분해 가능 |
| 프로젝트 수정 (인라인 편집) | 삭제·재생성으로 우회 가능 |
| 모바일 폭 폴리싱 | 데스크탑 우선 |

---

## §1. 분담 큰 그림

| 구역 | 담당 | Phase 코드 |
|---|---|---|
| AppShell · 라우팅 · 헤더 | **페어** | P1 |
| 입력 화면 + 템플릿 카탈로그 | **재은** | R1, R5 |
| AI 분해 백엔드 (프롬프트 + zod + VALIDATE + 1차/2차 분해) | **재은** | R2, R3 |
| 결과 4블록 UI | **재은** | R4 |
| Supabase 스키마 + RLS | **지희** | J1 |
| 인증 + 세션 가드 | **지희** | J2 |
| 전체 탭 (목록 + 상세) + 프로젝트 라우트 | **지희** | J3, J4 |
| 단계 체크 + 진행률 | **지희** | J5 |
| 타이머 + 헤더 "오늘 N분" | **지희** | J6 |

---

## §2. Phase 상세 — 페어

### P1. AppShell + 라우팅 + 헤더 — **페어**

| 항목 | 내용 |
|---|---|
| **작업일** | 0.5일 (4/29 오전) |
| **선행 조건** | Day 0(4/28)에 Tailwind, react-router-dom, lucide-react 설치 완료 |
| **검증** | 5173에서 5탭 클릭 시 URL 변경. 폭 1024 기준 사이드바↔하단 자동 전환 |
| **PR 브랜치** | `feat/app-shell` |

**산출물**:
- [x] `frontend/src/App.tsx` (라우팅 5개)
- [x] `components/AppShell.tsx` (반응형 좌측 사이드바 ↔ 하단 네비)
- [x] `components/Header.tsx` (로고 + "오늘 0분" 필)
- [x] 5개 페이지 placeholder (`HomePage`, `CalendarPage`, `AllPage`, `ReportPage`, `MePage`)

---

## §3. Phase 상세 — 재은

### R1. 홈 입력 화면 — **재은**

| 항목 | 내용 |
|---|---|
| **작업일** | 1일 (4/29 오후 ~ 4/30 오전) |
| **선행 조건** | P1 완료 |
| **검증** | 빈 제목 차단, 28자 초과 표시, 제출 시 mock 결과 콘솔 출력 |
| **PR 브랜치** | `feat/home-input` |

**산출물**:
- [x] `pages/HomePage.tsx` (직접 입력/템플릿 탭 토글)
- [x] `components/InputForm.tsx` (제목·메모·시작/마감일·AI 토글 + react-hook-form + zod) -> **현재는 HomPage.tsx에 통합 구현됨. 분리 필요.**
- [x] `services/decompose.ts` (mock 응답: setTimeout 1초 → 하드코딩 JSON)
- [x] `services/tasks.ts` (단일 작업 흐름 검증용. localstorage 기반 `addTask` / `listTasks` / `setTaskDone`)
- [x] `pages/AllPage.tsx` (단일 작업 추가 검증용 placeholder)
- [x] 의존성 추가: `react-hook-form`, `zod`, `@hookform/resolvers`

### R2. DECOMPOSE 백엔드 (Anthropic SDK 연결) — **재은**

| 항목 | 내용 |
|---|---|
| **작업일** | 2일 (4/30 오후 ~ 5/2) |
| **선행 조건** | Day 0에 Anthropic 키 발급, R1의 mock 응답 형태 확정 |
| **검증** | Invoke-RestMethod로 호출 시 §4.4 통합 JSON 응답. 두 번째 호출이 첫 호출보다 빠르고 응답에 `cache_read_input_tokens` > 0 |
| **PR 브랜치** | `feat/decompose-api` |

**검증 상세**

1. 터미널 A — 백엔드 dev 서버 기동:

   ```powershell
   npm run dev:backend
   ```

2. 터미널 B — POST `/api/decompose` 호출 후 응답을 `response.json`으로 저장:

   ```powershell
   $body = @{
     title     = "직무 설정 보고서"
     memo      = "직무를 설정해주세요. 직무 정의, 특성, 필요 역량과 스펙을 조사해서 작성해주세요. 분량 및 형식 제한 없습니다."
     startDate = "2026-05-02"
     dueDate   = "2026-05-03"
   } | ConvertTo-Json
   $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

   $response = Invoke-RestMethod -Uri http://localhost:4000/api/decompose `
     -Method Post `
     -ContentType "application/json; charset=utf-8" `
     -Body $bytes

   $response | ConvertTo-Json -Depth 10 | Out-File -FilePath response.json -Encoding utf8
   ```

3. 생성된 `response.json` 내용 확인

**산출물**:
- [x] `backend/src/prompts/decompose-system.ts` (시스템 프롬프트 + 6 신호 §4.2 + 3 규칙 §4.3 + JSON 스키마)
- [x] `backend/src/schemas/decompose.ts` (zod)
- [x] `backend/src/routes/decompose.ts` (POST 라우트, Anthropic SDK 호출, JSON 파싱 → zod parse)
- [x] `cache_control: { type: "ephemeral" }` 적용
- [x] 의존성 추가: `@anthropic-ai/sdk": "^0.92.0"`

### R3. VALIDATE + 안정화 — **재은**

| 항목 | 내용 |
|---|---|
| **작업일** | 1.5일 (5/3 자율 ~ 5/4 오전) |
| **선행 조건** | R2 완료 |
| **검증** | 단계 1개로 응답되면 `no_decomposition` blocker → 자동 재시도 후 통과. id 중복 시 `duplicate_id` blocker → 자동 재시도. zod 깨진 응답 2회 연속이면 422. 2차 분해(`/api/decompose/sub`)가 부모 step_id 강제 주입해 응답 |
| **PR 브랜치** | `feat/validate` |

**산출물**:
- [x] `backend/src/validate/index.ts` (단일 검증 파일. `validate(steps) → { ok, issues, hasBlocker }`. checkDecomposed + checkDuplicateIds 두 개의 검사)
- [x] `backend/src/schemas/decompose.ts`에 `SubDecomposeRequestSchema` 추가, `StepSchema`에서 `quality_flags` 제거
- [x] `backend/src/prompts/decompose-system.ts`에 `# 분해 모드` 블록 추가(1차=phase, 2차=atomic), id 유일성·외부 대기 흡수 규칙 명시
- [x] `routes/decompose.ts` 재작성 — `runDecompose` 공통 함수, `POST /` (1차) + `POST /sub` (2차), atomic 모드에서 `parent_step_id` 강제 주입, blocker 시 issue 추가하여 1회 재시도
- [x] 응답 본문에 `validation: { ok, issues }` 블록 추가 (프론트 점진 도입 가능)

### R4. 결과 4블록 UI — **재은**

| 항목 | 내용 |
|---|---|
| **작업일** | 2일 (5/4 오후 ~ 5/6) |
| **선행 조건** | R2, R3 완료. R1의 입력 화면이 진짜 백엔드를 호출하도록 교체 |
| **검증** | 입력→백엔드 호출→4블록 표시 흐름 끝까지 통과. RefineBlock의 "더 잘게" 클릭 시 단계 수 증가 |
| **PR 브랜치** | `feat/result-blocks` |

**산출물**:
- [x] `pages/ResultPage.tsx` (4블록 컨테이너)
- [x] `components/result/ResultBlock.tsx` (단계 카드 리스트 + ✦ 뱃지)
- [x] `components/result/StepCard.tsx` (접힘/펼침, 가이드 텍스트 + 예상 시간 뱃지)
- [x] `components/result/ReasoningBlock.tsx` (왜 이렇게 나눴어요? 펼침)
- [x] `components/result/RefineBlock.tsx` (더 잘게/더 크게 두 버튼 → 백엔드 재호출)
- [x] `components/result/ConfirmBlock.tsx` (확정/돌아가기/단일저장 3버튼)

### R5. ④확정 통합 + 템플릿 카탈로그 — **재은**

| 항목 | 내용 |
|---|---|
| **작업일** | 1.5일 (5/7 ~ 5/8) |
| **선행 조건** | R4 완료, J3의 `POST /api/projects` 라우트 동작 |
| **검증** | 확정 → DB 저장 → 새로고침 후 /all에서 다시 보임. 템플릿 클릭 → 입력 폼 자동 채워짐 |
| **PR 브랜치** | `feat/confirm-and-templates` |

**산출물**:
- [ ] ConfirmBlock의 "확정하기" → `POST /api/projects` 호출 → /all 자동 이동
- [ ] `services/templates.ts` (정적 배열 — 학업·개발·글쓰기 3개)
- [ ] 템플릿 탭 카탈로그 카드 UI
- [ ] 카드 선택 시 입력 폼에 prefill (제목·기간) + `templateHint` 백엔드 전달

**재은 합계**: 0.5(P1) + 1(R1) + 2(R2) + 1.5(R3) + 2(R4) + 1.5(R5) = **8.5일** (10일 중 1.5일은 5/2 자율 + 5/5 어린이날 휴식 흡수)

---

## §4. Phase 상세 — 지희

### J1. Supabase 스키마 + RLS — **지희**

| 항목 | 내용 |
|---|---|
| **작업일** | 1일 (4/29 오후) |
| **선행 조건** | Day 0에 Supabase 프로젝트 생성 |
| **검증** | Supabase Table Editor에서 6개 테이블 보임. RLS 정책 표에 "Authenticated only own rows" 표시 |
| **PR 브랜치** | `feat/db-schema` |

**산출물**:
- [x] `supabase/migrations/001_initial.sql` (§14.1의 6개 테이블 — users, projects, decompositions, steps, reasoning_logs, schedule_assignments)
- [x] `supabase/migrations/002_rls.sql` (모든 테이블에 user_id 기반 RLS 정책)
- [x] Supabase Studio에서 마이그레이션 실행 + 테이블 확인

### J2. 인증 + 세션 가드 — **지희**

| 항목 | 내용 |
|---|---|
| **작업일** | 1.5일 (4/30 ~ 5/1 오전) |
| **선행 조건** | J1 완료 |
| **검증** | 로그아웃 상태에서 / 접근 시 /login으로 redirect. 로그인 후 /api/me 호출 시 본인 정보 응답 |
| **PR 브랜치** | `feat/auth` |

**산출물**:
- [x] `frontend/src/lib/supabase.ts` (anon 키)
- [x] `backend/src/lib/supabase.ts` (service_role 키)
- [x] `pages/LoginPage.tsx` (자체 폼 — Email + Password 로그인/회원가입)
- [x] `components/SessionGuard.tsx` (세션 없으면 /login으로 redirect)
- [x] `backend/src/middleware/auth.ts` (Authorization JWT 검증 → req.userId)
- [x] `backend/src/routes/me.ts` (GET /api/me — 본인 프로필 반환)
- [x] `backend/src/env.ts` (백엔드 환경변수 zod 검증)
- [x] `frontend/src/App.tsx` (`/login` 라우트 + 보호 라우트 연결)
- [x] `backend/src/index.ts` (`/api/me` 라우트 연결)

**J2 후속 개선** (`feat/auth-improvements` PR):
- [x] `pages/LoginPage.tsx` — 비밀번호 보기/숨기기 토글, 회원가입 비밀번호 재확인, 에러 메시지 한글화, 이메일 trim/lowercase 정규화, autocomplete 속성, role=alert 접근성 보강, 한국어 주석 추가
- [x] `pages/MePage.tsx` — 로그아웃 버튼 추가 (기존 placeholder를 별도 파일로 분리)

### J3. 프로젝트 라우트 + 전체 탭 목록 — **지희**

| 항목 | 내용 |
|---|---|
| **작업일** | 2.5일 (5/1 오후 ~ 5/4) |
| **선행 조건** | J1, J2 완료. R5의 ConfirmBlock이 호출할 라우트 |
| **검증** | DB에 직접 row 추가 → /all에서 카드로 보임. 마감일 그룹핑 + 빈 상태 동작 |
| **PR 브랜치** | `feat/all-tab` |

**산출물**:
- [x] `backend/src/schemas/project.ts` (zod)
- [x] `backend/src/routes/projects.ts` (GET 목록 · POST 생성 · DELETE 삭제)
- [x] `pages/AllPage.tsx` (목록 모드)
- [x] `components/all/ProjectCard.tsx` (일반 카드 — 색상 점·진행률 바·다음 단계 박스·삭제 버튼)
- [x] `components/all/SingleCard.tsx` (단일 카드 — 체크박스만)
- [x] D-Day 그룹핑 + 빈 상태 (§10.2.5)
- [x] `frontend/src/services/projects.ts` (`/api/projects` 호출 함수)
- [x] `backend/src/index.ts` (`/api/projects` 라우트 연결)
- [x] `backend/src/middleware/auth.ts` (`public.users` 프로필 upsert 보강)

### J4. 프로젝트 상세 화면 — **지희**

| 항목 | 내용 |
|---|---|
| **작업일** | 1.5일 (5/6 ~ 5/7 오전) |
| **선행 조건** | J3 완료 |
| **검증** | /all에서 카드 클릭 → 상세 진입. 다음 단계가 자동 펼침 상태. 목록으로 버튼 → /all 복귀 |
| **PR 브랜치** | `feat/project-detail` |

**산출물**:
- [x] `pages/ProjectDetailPage.tsx` (상세 모드)
- [x] `components/detail/ProgressCard.tsx` (% 바 + 완료/전체)
- [x] `components/detail/StepRow.tsx` (단계 카드 — 접힘/펼침, 번호 뱃지, 다음 단계 강조)
- [x] 헤더 ← 뒤로가기 + 프로젝트명 + D-Day
- [x] 하단 액션 (수정·삭제·목록으로)

**J4 추가 산출물**:
- [x] `backend/src/routes/projects.ts`에 `GET /api/projects/:id` 추가 — 상세 페이지에서 단계 가이드 포함 전체 데이터를 불러오기 위해 필요. 기존 목록 API(`GET /api/projects`)는 요약 정보만 반환하므로 별도 엔드포인트 추가.

### J5. 단계 체크 + 진행률 — **지희**

| 항목 | 내용 |
|---|---|
| **작업일** | 1일 (5/7 오후) |
| **선행 조건** | J4 완료 |
| **검증** | 단계 체크 → DB UPDATE → 상세 % 갱신 → /all 카드도 갱신. 새로고침 후에도 유지 |
| **PR 브랜치** | `feat/step-check` |

**산출물**:
- [x] `backend/src/routes/steps.ts` (PATCH /api/steps/:id — done 토글)
- [x] `backend/src/schemas/step.ts` (zod)
- [x] 상세 화면의 단계 체크박스 + 클릭 시 PATCH 호출
- [x] 진행률 자동 재계산 (frontend에서 done 비율 계산)
- [x] 카드 진행률 바도 즉시 갱신

### J6. 타이머 + 헤더 "오늘 N분" — **지희**

| 항목 | 내용 |
|---|---|
| **작업일** | 1.5일 (5/8) |
| **선행 조건** | J5 완료 |
| **검증** | 단계의 "시작" → 25분(시연 시 30초) 카운트다운 → 종료 후 헤더 "오늘 N분" 갱신 |
| **PR 브랜치** | `feat/timer` |

**산출물**:
- [x] `pages/TimerPage.tsx` (시간 설정 화면 + 카운트다운)
- [x] `components/timer/CountdownRing.tsx` (원형 SVG 프로그레스)
- [x] `backend/src/routes/timer.ts` (POST /api/steps/:id/time — time_spent 누적)
- [x] 종료 시 단계의 `time_spent` UPDATE
- [x] `Header.tsx`에 "오늘 N분" 실시간 — 컴포넌트 마운트 시 GET /api/me/today-minutes (오늘 모든 단계 time_spent 합산)

**J6 추가 산출물**:
- [x] `backend/src/routes/me.ts`에 `GET /api/me/today-minutes` 추가
- [x] `frontend/src/services/timer.ts` (API 호출 함수 — postTimeSpent, getTodayMinutes)
- [x] `AppShell.tsx` — 라우트 변경 시 오늘 N분 재조회 후 Header에 전달
- [x] `StepRow.tsx` — "시작" 버튼 → `/timer/:stepId` 이동 연결
- [x] `ProjectCard.tsx` — 카드 전체 클릭 상세 이동, 다음 할 일 영역 클릭 타이머 이동, ChevronRight 복원, 삭제 버튼 제거(상세에서만 삭제)
- [x] `AllPage.tsx` — D-Day 뱃지 색상 앱 톤에 맞게 개선
- [x] `index.css` — 타이머 슬라이더 커스텀 스타일 추가

**지희 합계**: 0.5(P1) + 1(J1) + 1.5(J2) + 2.5(J3) + 1.5(J4) + 1(J5) + 1.5(J6) = **9.5일**

---

## §5. 종합 일별 캘린더

| Day | 날짜 | 재은 | 지희 |
|---|---|---|---|
| 1 | 4/29 수 | 오전 페어 P1 → 오후 R1 시작 | 오전 페어 P1 → 오후 J1 시작 |
| 2 | 4/30 목 | R1 마무리 → R2 시작 | J1 마무리 → J2 시작 |
| 3 | 5/1 금 | R2 (시스템 프롬프트 + Anthropic 첫 호출) | J2 마무리 → J3 시작 (라우트) |
| 4 | 5/2 토 (자율) | R2 (zod 검증, 실패 처리) | J3 (전체 탭 카드 그리드) |
| 5 | 5/3 일 (자율) | R3 시작 (validate 단일 파일 + 모드 분기) | J3 (D-Day 그룹핑, 빈 상태) |
| 6 | 5/4 월 | R3 마무리 → R4 시작 | J3 마무리 (DELETE 라우트, 단일 카드) |
| 7 | 5/5 화 (어린이날) | **휴식 권장** | **휴식 권장** |
| 8 | 5/6 수 | R4 (4블록 컴포넌트 작성) | J4 시작 (상세 화면) |
| 9 | 5/7 목 | R4 마무리 → R5 시작 (확정 통합) | J4 마무리 → J5 (단계 체크) |
| 10 | 5/8 금 | R5 (템플릿 카탈로그) | J6 (타이머 + 헤더 N분) |

---

## §6. 검증 체크포인트

### 5/2 (Day 4 끝) — Phase 절반 점검

- [ ] R1 PR merged (입력 폼 동작)
- [ ] J1 PR merged (Supabase 6테이블 + RLS)
- [ ] R2 진행 중 (Anthropic 첫 호출 성공 여부)
- [ ] J2 진행 중 (로그인 화면 동작 여부)

**위험 신호**: R2의 Anthropic 호출이 안 되면 5/3에 모델을 Sonnet으로 교체. J2가 안 되면 5/3에 일시적으로 인증 우회 모드 추가하고 5/4에 다시 켜기.

### 5/4 (Day 6 끝) — 백엔드/저장 토대 완성

- [ ] R3 PR merged (VALIDATE 동작)
- [ ] J3 PR merged (전체 탭 mock 카드 표시)
- [ ] /api/decompose가 zod 통과한 응답을 안정적으로 반환

**위험 신호**: 여기서 막히면 R4·J4가 5/6에 시작 못 함. 그 경우 R4(결과 UI)와 J4(상세 화면)에서 폴리싱을 줄이고 핵심만.

### 5/7 (Day 9 끝) — UI 토대 완성

- [ ] R4 PR merged (4블록 표시)
- [ ] J4·J5 PR merged (상세 화면 + 단계 체크)
- [ ] 입력 → 분해 → 결과 → 확정 → /all → 상세 → 단계 체크 → 새로고침 → 유지가 한 번 통과

**위험 신호**: ④확정 통합이 5/7에 안 끝나면 5/8 종일 통합에 투입, 템플릿 카탈로그(R5)와 타이머(J6)는 5/9 이후로.

### 5/8 (Day 10 끝) — 프로토타입 핵심 구현 완료

다음 시나리오가 끊김 없이 통과:

```
1. 회원가입 → 로그인
2. 홈 → 직접 입력 → "AI 할 일 분해 서비스 석사 논문 쓰기, 6개월 마감"
3. 5~10초 로딩 → 4블록 결과
4. ResultBlock에서 첫 단계 펼쳐 가이드 보기
5. ReasoningBlock 펼쳐 추론 보기
6. RefineBlock에서 "더 잘게" 한 번 → 단계 수 증가
7. ConfirmBlock의 "확정하기" → /all 자동 이동
8. 카드 클릭 → 상세 진입 → 첫 단계 체크 → 진행률 갱신
9. 단계 "시작" → 타이머 25분 → (시연용 30초로 줄여) 종료
10. 헤더 "오늘 1분" 표시 확인
11. 새로고침 → 모든 데이터 유지
12. 홈 → 템플릿 탭 → 학업 카드 → 입력 폼 prefill 확인
```

---

## §7. 진행 현황 한눈에

각 Phase의 산출물 체크박스를 매일 확인. 채워지지 않은 항목이 다음 일정으로 넘어가면 즉시 sync에서 알리기.

### 진행률 빠르게 보기

```bash
# 전체 산출물 중 몇 % 완료됐는지 — VS Code에서 Ctrl+F로 [x] 와 [ ] 갯수 확인
# 또는 셸에서:
grep -c "\[x\]" MEMBER_PLAN.md   # 완료 산출물 수
grep -c "\[ \]" MEMBER_PLAN.md   # 미완 산출물 수
```

### Phase별 완료 기준

각 Phase가 "끝났다"의 정의: **해당 산출물 박스 100% [x]** + **PR이 main에 머지됨**.

---

## §8. 작업 산출물 합계 (5/8 기준)

코드 파일 기준 대략적인 산출 규모:

| 영역 | 파일 수 (approx) | 주요 파일 |
|---|---|---|
| `frontend/src/components/` | ~12 | AppShell, Header, InputForm, ProjectCard, StepCard, 4블록 컴포넌트 등 |
| `frontend/src/pages/` | ~6 | HomePage, ResultPage, AllPage, ProjectDetailPage, TimerPage, LoginPage |
| `frontend/src/services/` | ~3 | decompose, projects, templates |
| `frontend/src/lib/` | ~2 | supabase, api client |
| `backend/src/routes/` | ~5 | decompose, projects, steps, timer, me |
| `backend/src/prompts/` | 1 | decompose-system |
| `backend/src/schemas/` | ~3 | decompose, project, step |
| `backend/src/validate/` | 1 | index.ts (분해 성립 + step id 유일성) |
| `backend/src/middleware/` | 1 | auth |
| `backend/src/lib/` | 1 | supabase |
| `supabase/migrations/` | 2 | 001_initial.sql, 002_rls.sql |

---

## §9. 매일 확인할 한 가지

**"오늘 끝낼 phase의 산출물 박스가 모두 [x]로 채워졌는가?"** 매일 작업 끝에 본인 phase 표 펴서 점검. 채워지지 않은 박스가 있으면 다음 날 첫 작업으로 끌고 가지 말고, 즉시 sync에서 알리고 일정 재조정.

---

*— 5/8까지 phase 계획 v2 · 체크박스 형식 · 2026.04.28*
