alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.decompositions enable row level security;
alter table public.steps enable row level security;
alter table public.reasoning_logs enable row level security;
alter table public.schedule_assignments enable row level security;

create policy "Authenticated users can read own profile"
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

create policy "Authenticated users can insert own profile"
  on public.users
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "Authenticated users can update own profile"
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Authenticated users can delete own profile"
  on public.users
  for delete
  to authenticated
  using (id = auth.uid());

create policy "Authenticated users can read own projects"
  on public.projects
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Authenticated users can insert own projects"
  on public.projects
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Authenticated users can update own projects"
  on public.projects
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Authenticated users can delete own projects"
  on public.projects
  for delete
  to authenticated
  using (user_id = auth.uid());

create policy "Authenticated users can read own decompositions"
  on public.decompositions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = decompositions.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can insert own decompositions"
  on public.decompositions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = decompositions.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can update own decompositions"
  on public.decompositions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = decompositions.project_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = decompositions.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can delete own decompositions"
  on public.decompositions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = decompositions.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can read own steps"
  on public.steps
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.decompositions
      join public.projects on projects.id = decompositions.project_id
      where decompositions.id = steps.decomposition_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can insert own steps"
  on public.steps
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.decompositions
      join public.projects on projects.id = decompositions.project_id
      where decompositions.id = steps.decomposition_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can update own steps"
  on public.steps
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.decompositions
      join public.projects on projects.id = decompositions.project_id
      where decompositions.id = steps.decomposition_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.decompositions
      join public.projects on projects.id = decompositions.project_id
      where decompositions.id = steps.decomposition_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can delete own steps"
  on public.steps
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.decompositions
      join public.projects on projects.id = decompositions.project_id
      where decompositions.id = steps.decomposition_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can read own reasoning logs"
  on public.reasoning_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.decompositions
      join public.projects on projects.id = decompositions.project_id
      where decompositions.id = reasoning_logs.decomposition_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can insert own reasoning logs"
  on public.reasoning_logs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.decompositions
      join public.projects on projects.id = decompositions.project_id
      where decompositions.id = reasoning_logs.decomposition_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can update own reasoning logs"
  on public.reasoning_logs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.decompositions
      join public.projects on projects.id = decompositions.project_id
      where decompositions.id = reasoning_logs.decomposition_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.decompositions
      join public.projects on projects.id = decompositions.project_id
      where decompositions.id = reasoning_logs.decomposition_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can delete own reasoning logs"
  on public.reasoning_logs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.decompositions
      join public.projects on projects.id = decompositions.project_id
      where decompositions.id = reasoning_logs.decomposition_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can read own schedule assignments"
  on public.schedule_assignments
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Authenticated users can insert own schedule assignments"
  on public.schedule_assignments
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Authenticated users can update own schedule assignments"
  on public.schedule_assignments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Authenticated users can delete own schedule assignments"
  on public.schedule_assignments
  for delete
  to authenticated
  using (user_id = auth.uid());
