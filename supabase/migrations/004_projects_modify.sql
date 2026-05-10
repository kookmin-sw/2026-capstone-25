-- (1) 사용자가 입력한 '제목'을 별도 컬럼으로 보존한다.
--     카드 표시(ProjectSummary.title)는 사용자 입력 제목을, projects.goal은
--     AI가 정제한 의미 목표를 유지한다. 기존 row는 NULL로 두고 백엔드 매핑이 goal로 fallback.
-- (2) title이 분리되면서 raw_input은 더 이상 의미가 없어, 사용자 메모를 직접 보관하는
--     memo 컬럼으로 교체한다. raw_input 컬럼은 제거 — 기존 row 데이터는 손실됨 (dev 단계 가정).
alter table public.projects
  add column if not exists title text,
  add column if not exists memo text;

alter table public.projects
  drop column if exists raw_input;
