-- Automatic Loved One email delivery. Server processing uses the service role;
-- mobile clients can only read their own rows and update scheduled rows.

create extension if not exists pgcrypto;

create table if not exists public.future_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  future_message_id uuid,
  diary_id uuid,
  entry_id uuid,
  recipient_name text not null,
  recipient_email text not null,
  sender_name text,
  subject text not null,
  message_text text not null,
  delivery_date timestamptz not null,
  timezone text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'processing', 'delivered', 'failed', 'cancelled')),
  consent_confirmed boolean not null default false,
  delivery_attempts integer not null default 0 check (delivery_attempts >= 0),
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  resend_email_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_future_email_deliveries_user_id
  on public.future_email_deliveries(user_id);
create index if not exists idx_future_email_deliveries_status
  on public.future_email_deliveries(status);
create index if not exists idx_future_email_deliveries_delivery_date
  on public.future_email_deliveries(delivery_date);
create index if not exists idx_future_email_deliveries_status_delivery_date
  on public.future_email_deliveries(status, delivery_date);

alter table public.future_email_deliveries enable row level security;

drop policy if exists "owners_select_future_email_deliveries" on public.future_email_deliveries;
drop policy if exists "owners_insert_future_email_deliveries" on public.future_email_deliveries;
drop policy if exists "owners_update_scheduled_future_email_deliveries" on public.future_email_deliveries;

create policy "owners_select_future_email_deliveries"
on public.future_email_deliveries for select to authenticated
using (user_id = auth.uid());

create policy "owners_insert_future_email_deliveries"
on public.future_email_deliveries for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'scheduled'
  and delivery_attempts = 0
  and delivered_at is null
  and resend_email_id is null
);

create policy "owners_update_scheduled_future_email_deliveries"
on public.future_email_deliveries for update to authenticated
using (user_id = auth.uid() and status = 'scheduled')
with check (
  user_id = auth.uid()
  and status in ('scheduled', 'cancelled')
  and delivered_at is null
  and resend_email_id is null
);

