-- schedule_assignments 에 우선순위 컬럼을 추가한다.
-- 같은 날짜에 여러 단계가 배정될 때 priority ASC 순으로 정렬한다.
alter table public.schedule_assignments
  add column if not exists priority integer not null default 0;
