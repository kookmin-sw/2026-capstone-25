-- AI(DECOMPOSE)가 산출하는 first_move(첫 동작)와 unblocker(막힘 대응)를
-- 결과 화면 이후에도 라벨링된 박스로 표시하기 위해 컬럼을 추가한다.
alter table public.steps
  add column if not exists first_move text,
  add column if not exists unblocker text;
