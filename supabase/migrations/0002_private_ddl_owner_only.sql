-- 私有 DDL 改为仅本人可见（管理员也不可见）
-- 原策略：visibility='public' or owner or is_admin()
-- 新策略：visibility='public' or owner
drop policy if exists deadlines_select on public.deadlines;
create policy deadlines_select on public.deadlines for select
  using (
    visibility = 'public'
    or member_id = public.current_member_id()
  );
