-- Optional, user-triggered Amanat Diary cloud backup.
-- Apply this migration in the Supabase SQL editor before enabling sync in the app.

create table if not exists public.profiles (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.diaries (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  subtitle text,
  category text,
  cover_style text,
  accent_color text,
  is_locked boolean not null default false,
  default_mood text,
  entry_count integer not null default 0,
  sync_status text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.entries (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  diary_id text not null,
  page_number integer not null,
  title text,
  body_original text,
  body_polished text,
  mood text,
  theme_id text,
  ai_detected_theme text,
  user_overridden_theme boolean not null default false,
  tags jsonb not null default '[]'::jsonb,
  date text,
  day text,
  time text,
  is_favorite boolean not null default false,
  is_locked boolean not null default false,
  has_voice boolean not null default false,
  has_media boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.voice_notes (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  entry_id text not null,
  local_path text,
  remote_path text,
  duration integer,
  transcript text,
  language text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.media (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  entry_id text not null,
  type text,
  local_path text,
  remote_path text,
  thumbnail_path text,
  width integer,
  height integer,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.future_messages (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  entry_id text,
  diary_id text,
  title text,
  body text,
  voice_note_id text,
  recipient_name text,
  recipient_email text,
  delivery_date text,
  delivery_type text,
  status text,
  unlock_date text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.collections (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  description text,
  entry_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.sync_log (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text,
  summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles','diaries','entries','voice_notes','media','future_messages','collections','sync_log']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "owners_select_%1$s" on public.%1$I', table_name);
    execute format('drop policy if exists "owners_insert_%1$s" on public.%1$I', table_name);
    execute format('drop policy if exists "owners_update_%1$s" on public.%1$I', table_name);
    execute format('drop policy if exists "owners_delete_%1$s" on public.%1$I', table_name);
    execute format('create policy "owners_select_%1$s" on public.%1$I for select to authenticated using (user_id = auth.uid())', table_name);
    execute format('create policy "owners_insert_%1$s" on public.%1$I for insert to authenticated with check (user_id = auth.uid())', table_name);
    execute format('create policy "owners_update_%1$s" on public.%1$I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', table_name);
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values ('diary-media', 'diary-media', false), ('diary-voice', 'diary-voice', false)
on conflict (id) do update set public = false;

drop policy if exists "owners_read_diary_files" on storage.objects;
drop policy if exists "owners_upload_diary_files" on storage.objects;
drop policy if exists "owners_update_diary_files" on storage.objects;
drop policy if exists "owners_delete_diary_files" on storage.objects;

create policy "owners_read_diary_files" on storage.objects for select to authenticated
using (bucket_id in ('diary-media', 'diary-voice') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners_upload_diary_files" on storage.objects for insert to authenticated
with check (bucket_id in ('diary-media', 'diary-voice') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners_update_diary_files" on storage.objects for update to authenticated
using (bucket_id in ('diary-media', 'diary-voice') and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id in ('diary-media', 'diary-voice') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners_delete_diary_files" on storage.objects for delete to authenticated
using (bucket_id in ('diary-media', 'diary-voice') and (storage.foldername(name))[1] = auth.uid()::text);
