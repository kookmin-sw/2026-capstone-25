-- 리포트 탭 데모용 시드 데이터
-- 대상 유저: af52a049-ebdb-4e6d-99a6-33be7f4fdb46
-- 실행 전 주의: Supabase SQL Editor에서 실행

-- ── 0. 변수 설정 (유저 ID) ──────────────────────────────────────────────────
DO $$
DECLARE
  uid uuid := 'af52a049-ebdb-4e6d-99a6-33be7f4fdb46';

  -- 프로젝트 IDs
  p1 uuid := 'b1000001-0000-0000-0000-000000000001'; -- 포트폴리오 정리
  p2 uuid := 'b1000001-0000-0000-0000-000000000002'; -- 알고리즘 스터디
  p3 uuid := 'b1000001-0000-0000-0000-000000000003'; -- 졸업논문
  p4 uuid := 'b1000001-0000-0000-0000-000000000004'; -- 토익 준비

  -- 분해 IDs (각 프로젝트 1개씩)
  d1 uuid := 'c2000001-0000-0000-0000-000000000001';
  d2 uuid := 'c2000001-0000-0000-0000-000000000002';
  d3 uuid := 'c2000001-0000-0000-0000-000000000003';
  d4 uuid := 'c2000001-0000-0000-0000-000000000004';

  -- 포트폴리오 steps
  s1_1 uuid := 'd3000001-0000-0000-0000-000000000011';
  s1_2 uuid := 'd3000001-0000-0000-0000-000000000012';
  s1_3 uuid := 'd3000001-0000-0000-0000-000000000013';
  s1_4 uuid := 'd3000001-0000-0000-0000-000000000014';
  s1_5 uuid := 'd3000001-0000-0000-0000-000000000015';
  s1_6 uuid := 'd3000001-0000-0000-0000-000000000016';

  -- 알고리즘 steps
  s2_1 uuid := 'd3000001-0000-0000-0000-000000000021';
  s2_2 uuid := 'd3000001-0000-0000-0000-000000000022';
  s2_3 uuid := 'd3000001-0000-0000-0000-000000000023';
  s2_4 uuid := 'd3000001-0000-0000-0000-000000000024';
  s2_5 uuid := 'd3000001-0000-0000-0000-000000000025';
  s2_6 uuid := 'd3000001-0000-0000-0000-000000000026';
  s2_7 uuid := 'd3000001-0000-0000-0000-000000000027';
  s2_8 uuid := 'd3000001-0000-0000-0000-000000000028';

  -- 졸업논문 steps
  s3_1 uuid := 'd3000001-0000-0000-0000-000000000031';
  s3_2 uuid := 'd3000001-0000-0000-0000-000000000032';
  s3_3 uuid := 'd3000001-0000-0000-0000-000000000033';
  s3_4 uuid := 'd3000001-0000-0000-0000-000000000034';
  s3_5 uuid := 'd3000001-0000-0000-0000-000000000035';
  s3_6 uuid := 'd3000001-0000-0000-0000-000000000036';

  -- 토익 steps
  s4_1 uuid := 'd3000001-0000-0000-0000-000000000041';
  s4_2 uuid := 'd3000001-0000-0000-0000-000000000042';
  s4_3 uuid := 'd3000001-0000-0000-0000-000000000043';
  s4_4 uuid := 'd3000001-0000-0000-0000-000000000044';

BEGIN

-- ── 1. 프로젝트 ──────────────────────────────────────────────────────────────
INSERT INTO public.projects (id, user_id, title, goal, color, due, created_at)
VALUES
  (p1, uid, '포트폴리오 정리', '취업용 포트폴리오 완성', '#4F86F7', '2026-05-29', '2026-04-15 10:00:00+09'),
  (p2, uid, '알고리즘 스터디', '코딩테스트 대비 알고리즘 학습', '#56C288', NULL,        '2026-04-18 10:00:00+09'),
  (p3, uid, '졸업논문',       '졸업논문 제출 완료',          '#FF8567', '2026-05-20', '2026-04-10 10:00:00+09'),
  (p4, uid, '토익 준비',      '토익 900점 달성',             '#A78BFA', '2026-06-15', '2026-04-20 10:00:00+09')
ON CONFLICT (id) DO NOTHING;

-- ── 2. 분해 ──────────────────────────────────────────────────────────────────
INSERT INTO public.decompositions (id, project_id, round, trigger, created_at)
VALUES
  (d1, p1, 1, 'initial', '2026-04-15 10:00:00+09'),
  (d2, p2, 1, 'initial', '2026-04-18 10:00:00+09'),
  (d3, p3, 1, 'initial', '2026-04-10 10:00:00+09'),
  (d4, p4, 1, 'initial', '2026-04-20 10:00:00+09')
ON CONFLICT (id) DO NOTHING;

-- ── 3. 단계 (steps) ───────────────────────────────────────────────────────────
-- 포트폴리오 정리 (6단계, 3완료)
INSERT INTO public.steps (id, decomposition_id, parent_step_id, order_idx, title, done, time_spent, estimated_minutes, updated_at)
VALUES
  (s1_1, d1, NULL, 0, '작업 프로젝트 목록 정리',      true,  45, 40,  '2026-05-06 21:30:00+09'),
  (s1_2, d1, NULL, 1, 'GitHub README 작성',            true,  50, 60,  '2026-05-08 22:00:00+09'),
  (s1_3, d1, NULL, 2, '대표 프로젝트 상세 설명 작성',  true,  40, 60,  '2026-05-13 21:30:00+09'),
  (s1_4, d1, NULL, 3, '기술 스택 정리 및 시각화',      false, 0,  30,  now()),
  (s1_5, d1, NULL, 4, '디자인 섹션 추가',              false, 0,  45,  now()),
  (s1_6, d1, NULL, 5, '배포 링크 확인 및 최종 점검',   false, 0,  30,  now())
ON CONFLICT (id) DO NOTHING;

-- 알고리즘 스터디 (8단계, 5완료)
INSERT INTO public.steps (id, decomposition_id, parent_step_id, order_idx, title, done, time_spent, estimated_minutes, updated_at)
VALUES
  (s2_1, d2, NULL, 0, '배열/문자열 기초 문제 풀기',    true,  30, 30,  '2026-04-21 22:00:00+09'),
  (s2_2, d2, NULL, 1, '해시맵 활용 문제 풀기',         true,  30, 30,  '2026-04-23 21:30:00+09'),
  (s2_3, d2, NULL, 2, '스택/큐 문제 풀기',             true,  30, 30,  '2026-04-29 21:30:00+09'),
  (s2_4, d2, NULL, 3, '그래프 BFS 문제 풀기',          true,  40, 40,  '2026-05-05 22:00:00+09'),
  (s2_5, d2, NULL, 4, '그래프 DFS 문제 풀기',          true,  50, 40,  '2026-05-12 21:30:00+09'),
  (s2_6, d2, NULL, 5, '동적 프로그래밍 입문',          false, 0,  60,  now()),
  (s2_7, d2, NULL, 6, 'DP 중급 문제 풀기',             false, 0,  60,  now()),
  (s2_8, d2, NULL, 7, '최단경로 알고리즘 학습',        false, 0,  45,  now())
ON CONFLICT (id) DO NOTHING;

-- 졸업논문 (6단계, 2완료, 마감 임박)
INSERT INTO public.steps (id, decomposition_id, parent_step_id, order_idx, title, done, time_spent, estimated_minutes, updated_at)
VALUES
  (s3_1, d3, NULL, 0, '관련 연구 조사 및 정리',  true,  30, 60,  '2026-04-24 22:00:00+09'),
  (s3_2, d3, NULL, 1, '서론 작성',               true,  30, 90,  '2026-05-01 21:30:00+09'),
  (s3_3, d3, NULL, 2, '연구 방법론 작성',        false, 0,  120, now()),
  (s3_4, d3, NULL, 3, '실험 설계 및 구현',       false, 0,  180, now()),
  (s3_5, d3, NULL, 4, '결과 분석',               false, 0,  120, now()),
  (s3_6, d3, NULL, 5, '결론 및 참고문헌 정리',   false, 0,  60,  now())
ON CONFLICT (id) DO NOTHING;

-- 토익 준비 (4단계, 0완료)
INSERT INTO public.steps (id, decomposition_id, parent_step_id, order_idx, title, done, time_spent, estimated_minutes, updated_at)
VALUES
  (s4_1, d4, NULL, 0, '파트 5 문법 핵심 정리',     false, 0, 60,  now()),
  (s4_2, d4, NULL, 1, '파트 6 연습문제 풀기',      false, 0, 60,  now()),
  (s4_3, d4, NULL, 2, '파트 7 독해 전략 학습',     false, 0, 90,  now()),
  (s4_4, d4, NULL, 3, '모의고사 1회 풀고 오답 정리', false, 0, 120, now())
ON CONFLICT (id) DO NOTHING;

-- ── 4. 타이머 세션 (4주치, 저녁 21~22시 집중) ────────────────────────────────
-- 3주 전 (04-20~04-26): 총 90분
INSERT INTO public.timer_sessions (id, step_id, user_id, mins, started_at)
VALUES
  (gen_random_uuid(), s2_1, uid, 30, '2026-04-21 21:30:00+09'),
  (gen_random_uuid(), s2_2, uid, 30, '2026-04-23 22:00:00+09'),
  (gen_random_uuid(), s3_1, uid, 30, '2026-04-24 21:00:00+09')
ON CONFLICT DO NOTHING;

-- 2주 전 (04-27~05-03): 총 130분
INSERT INTO public.timer_sessions (id, step_id, user_id, mins, started_at)
VALUES
  (gen_random_uuid(), s1_1, uid, 40, '2026-04-28 21:00:00+09'),
  (gen_random_uuid(), s2_3, uid, 30, '2026-04-29 21:30:00+09'),
  (gen_random_uuid(), s3_2, uid, 30, '2026-05-01 22:00:00+09'),
  (gen_random_uuid(), s1_1, uid, 30, '2026-05-02 21:00:00+09')
ON CONFLICT DO NOTHING;

-- 지난주 (05-04~05-10): 총 180분
INSERT INTO public.timer_sessions (id, step_id, user_id, mins, started_at)
VALUES
  (gen_random_uuid(), s2_4, uid, 40, '2026-05-05 22:00:00+09'),
  (gen_random_uuid(), s1_1, uid, 40, '2026-05-06 21:30:00+09'),
  (gen_random_uuid(), s1_2, uid, 40, '2026-05-07 22:00:00+09'),
  (gen_random_uuid(), s2_4, uid, 30, '2026-05-08 21:00:00+09'),
  (gen_random_uuid(), s1_2, uid, 30, '2026-05-09 22:30:00+09')
ON CONFLICT DO NOTHING;

-- 이번 주 (05-11~05-15): 총 220분
INSERT INTO public.timer_sessions (id, step_id, user_id, mins, started_at)
VALUES
  (gen_random_uuid(), s1_3, uid, 50, '2026-05-11 21:00:00+09'),
  (gen_random_uuid(), s2_5, uid, 50, '2026-05-12 21:30:00+09'),
  (gen_random_uuid(), s1_3, uid, 40, '2026-05-13 22:00:00+09'),
  (gen_random_uuid(), s2_5, uid, 50, '2026-05-14 21:00:00+09'),
  (gen_random_uuid(), s1_4, uid, 30, '2026-05-15 22:00:00+09')
ON CONFLICT DO NOTHING;

END $$;
