-- R10 첨부파일 업로드용 Storage 버킷 + RLS 정책.
-- 분해 입력에 동봉되는 임시 첨부 파일을 보관한다.
-- 객체 경로 규칙: {user_id}/{session_id}/{hash}-{filename}
--   - 첫 폴더가 user_id (RLS 검사 키)
--   - 둘째 폴더 session_id 는 같은 분해 세션의 파일들을 묶어 cleanup 단위로 활용
--
-- 확정 저장 성공 / 돌아가기 시 클라이언트가 같은 path 들을 명시적으로 remove 한다.
-- 방치된 파일은 추후 cron 으로 청소 (capstone scope 외).

insert into storage.buckets (id, name, public)
values ('decompose-attachments', 'decompose-attachments', false)
on conflict (id) do nothing;

-- 재실행 시 42710 회피를 위해 정책을 먼저 삭제하고 재생성한다.
drop policy if exists "Users can upload own attachments" on storage.objects;
drop policy if exists "Users can read own attachments" on storage.objects;
drop policy if exists "Users can delete own attachments" on storage.objects;

-- 본인 폴더에만 read/write 가능. (storage.foldername(name))[1] 이 첫 폴더(user_id) 문자열을 반환.
create policy "Users can upload own attachments"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'decompose-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own attachments"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'decompose-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own attachments"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'decompose-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
