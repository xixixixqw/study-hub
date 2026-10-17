-- ============================================================
--  学习资料库 + DDL 提醒 · Supabase 迁移脚本
--  执行方式：Supabase Dashboard → SQL Editor → 整段粘贴执行
--            或 CLI：supabase db push
-- ============================================================

-- ---------- 1. 表结构 ----------

create table if not exists public.members (
  id            uuid primary key default gen_random_uuid(),
  auth_uid      uuid unique not null,
  nickname      text not null,
  qq            text,
  avatar_color  text default '#2563eb',
  avatar_url    text,
  role          text not null default 'member' check (role in ('member', 'admin')),
  upload_count  int  not null default 0,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create table if not exists public.materials (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references public.members(id) on delete cascade,
  uploader_nickname text not null,
  title            text not null,
  description      text,
  category         text not null default '其他',
  file_path        text not null,
  file_url         text,
  file_size        bigint not null default 0,
  mime_type        text,
  download_count   int not null default 0,
  is_pinned        boolean not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists public.deadlines (
  id                  uuid primary key default gen_random_uuid(),
  member_id           uuid not null references public.members(id) on delete cascade,
  title               text not null,
  description         text,
  due_at              timestamptz not null,
  remind_at           timestamptz,
  remind_before       text not null default '0' check (remind_before in ('0', '1h', '1d', '3d')),
  visibility          text not null default 'public' check (visibility in ('public', 'private')),
  status              text not null default 'todo' check (status in ('todo', 'done')),
  related_material_id uuid references public.materials(id) on delete set null,
  reminder_sent       boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.member_preferences (
  member_id               uuid primary key references public.members(id) on delete cascade,
  show_qq                 boolean not null default false,
  show_upload_count       boolean not null default true,
  show_join_time          boolean not null default true,
  show_my_deadlines_public boolean not null default true,
  visible_modules         jsonb not null default '{"memberWall":true,"materials":true,"deadlines":true,"upload":true}'::jsonb,
  module_order            jsonb not null default '["memberWall","materials","deadlines"]'::jsonb,
  hidden_deadline_ids     uuid[] not null default '{}',
  theme                   text not null default 'light',
  push_enabled            boolean not null default false,
  email_enabled           boolean not null default false,
  push_subscription       jsonb,
  updated_at              timestamptz not null default now()
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete cascade,
  type       text not null default 'deadline',
  title      text not null,
  content    text,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key   text primary key,
  value jsonb not null default '{}'::jsonb
);

-- ---------- 2. 索引 ----------

create index if not exists idx_materials_created   on public.materials (created_at desc);
create index if not exists idx_materials_category on public.materials (category);
create index if not exists idx_materials_member   on public.materials (member_id);
create index if not exists idx_deadlines_member   on public.deadlines (member_id);
create index if not exists idx_deadlines_due      on public.deadlines (due_at);
create index if not exists idx_deadlines_remind   on public.deadlines (remind_at) where status = 'todo';
create index if not exists idx_notifications_member on public.notifications (member_id, created_at desc);

-- ---------- 3. 触发器 ----------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_deadlines_touch on public.deadlines;
create trigger trg_deadlines_touch before update on public.deadlines
for each row execute function public.touch_updated_at();

drop trigger if exists trg_prefs_touch on public.member_preferences;
create trigger trg_prefs_touch before update on public.member_preferences
for each row execute function public.touch_updated_at();

-- 自动维护上传数
create or replace function public.sync_upload_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.members set upload_count = upload_count + 1 where id = new.member_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.members set upload_count = greatest(upload_count - 1, 0) where id = old.member_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists trg_materials_count on public.materials;
create trigger trg_materials_count
after insert or delete on public.materials
for each row execute function public.sync_upload_count();

-- 新成员自动建偏好行
create or replace function public.ensure_preferences()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.member_preferences (member_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists trg_member_prefs on public.members;
create trigger trg_member_prefs after insert on public.members
for each row execute function public.ensure_preferences();

-- ---------- 4. RPC ----------

-- 下载计数：只增计数，不返回行（避免泄露数据）
create or replace function public.increment_download_count(p_material_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.materials set download_count = download_count + 1 where id = p_material_id;
$$;

-- 管理员判定：基于 auth.jwt() 对应的 auth_uid 与 members.role
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where auth_uid = auth.uid() and role = 'admin'
  );
$$;

-- 当前成员身份（前端免二次查询）
create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.members where auth_uid = auth.uid() limit 1;
$$;

grant execute on function public.increment_download_count(uuid) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.current_member_id() to anon, authenticated;

-- ---------- 5. RLS ----------

alter table public.members            enable row level security;
alter table public.materials          enable row level security;
alter table public.deadlines          enable row level security;
alter table public.member_preferences enable row level security;
alter table public.notifications      enable row level security;
alter table public.settings           enable row level security;

-- members：所有人可读；写入仅 service_role（Edge Function）
drop policy if exists members_select_all on public.members;
create policy members_select_all on public.members for select using (true);

drop policy if exists members_admin_update on public.members;
create policy members_admin_update on public.members for update using (public.is_admin());

drop policy if exists members_admin_delete on public.members;
create policy members_admin_delete on public.members for delete using (public.is_admin());

-- materials：所有人读；登录可写自己的
drop policy if exists materials_select_all on public.materials;
create policy materials_select_all on public.materials for select using (true);

drop policy if exists materials_insert_own on public.materials;
create policy materials_insert_own on public.materials for insert
  with check (member_id = public.current_member_id());

drop policy if exists materials_update_own on public.materials;
create policy materials_update_own on public.materials for update
  using (member_id = public.current_member_id() or public.is_admin());

drop policy if exists materials_delete_own on public.materials;
create policy materials_delete_own on public.materials for delete
  using (member_id = public.current_member_id() or public.is_admin());

-- deadlines：公开人人可见；私有仅 owner 本人可见（管理员也不可见）
drop policy if exists deadlines_select on public.deadlines;
create policy deadlines_select on public.deadlines for select
  using (
    visibility = 'public'
    or member_id = public.current_member_id()
  );

drop policy if exists deadlines_insert on public.deadlines;
create policy deadlines_insert on public.deadlines for insert
  with check (member_id = public.current_member_id() or public.is_admin());

drop policy if exists deadlines_update on public.deadlines;
create policy deadlines_update on public.deadlines for update
  using (member_id = public.current_member_id() or public.is_admin())
  with check (member_id = public.current_member_id() or public.is_admin());

drop policy if exists deadlines_delete on public.deadlines;
create policy deadlines_delete on public.deadlines for delete
  using (member_id = public.current_member_id() or public.is_admin());

-- member_preferences：仅 owner / admin
drop policy if exists prefs_select on public.member_preferences;
create policy prefs_select on public.member_preferences for select
  using (member_id = public.current_member_id() or public.is_admin());

drop policy if exists prefs_insert on public.member_preferences;
create policy prefs_insert on public.member_preferences for insert
  with check (member_id = public.current_member_id() or public.is_admin());

drop policy if exists prefs_update on public.member_preferences;
create policy prefs_update on public.member_preferences for update
  using (member_id = public.current_member_id() or public.is_admin());

drop policy if exists prefs_delete on public.member_preferences;
create policy prefs_delete on public.member_preferences for delete
  using (member_id = public.current_member_id() or public.is_admin());

-- notifications：仅 owner
drop policy if exists notif_select_own on public.notifications;
create policy notif_select_own on public.notifications for select
  using (member_id = public.current_member_id() or public.is_admin());

drop policy if exists notif_update_own on public.notifications;
create policy notif_update_own on public.notifications for update
  using (member_id = public.current_member_id() or public.is_admin());

drop policy if exists notif_delete_own on public.notifications;
create policy notif_delete_own on public.notifications for delete
  using (member_id = public.current_member_id() or public.is_admin());

-- settings：所有人可读，仅 admin 可写
drop policy if exists settings_select_all on public.settings;
create policy settings_select_all on public.settings for select using (true);

drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- 6. Storage ----------
-- bucket: materials，公开读、登录可写。
-- 建bucket 用 SQL（幂等）：
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials', 'materials', true, 52428800,
  array[
    'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip','image/jpeg','image/png'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "materials_public_read" on storage.objects;
create policy "materials_public_read" on storage.objects for select
  using (bucket_id = 'materials');

drop policy if exists "materials_auth_insert" on storage.objects;
create policy "materials_auth_insert" on storage.objects for insert
  with check (bucket_id = 'materials' and auth.role() in ('anon','authenticated'));

drop policy if exists "materials_auth_update" on storage.objects;
create policy "materials_auth_update" on storage.objects for update
  using (bucket_id = 'materials' and auth.role() in ('anon','authenticated'));

drop policy if exists "materials_auth_delete" on storage.objects;
create policy "materials_auth_delete" on storage.objects for delete
  using (bucket_id = 'materials' and auth.role() in ('anon','authenticated'));

-- ---------- 7. 兜底：把首位成员或指定邮箱提升为管理员 ----------
-- 用法：把下面邮箱替换成管理员邮箱后单独执行一次。
-- update public.members set role = 'admin' where qq = '2219158964';

-- ---------- 8. pg_cron 定时调用 Edge Function ----------
-- 需先在 Supabase Dashboard → Edge Functions → Secrets 配置：
--   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY(自动) / GROUP_CODE / ADMIN_EMAILS
-- 下面以每小时整点为例；改成每分钟：'*/1 * * * *'
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'send-deadline-reminders';
    perform cron.schedule(
      'send-deadline-reminders',
      '7 * * * *',
      $cron$select net.http_post(
        url := current_setting('app.settings.supabase_url', true),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
      )$cron$
    );
  end if;
exception when others then
  raise notice 'pg_cron 未启用，跳过定时任务注册：%', sqlerrm;
end $$;