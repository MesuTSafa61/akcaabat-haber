alter table public.contact_messages
  add column if not exists message_type text not null default 'contact',
  add column if not exists phone text,
  add column if not exists related_url text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists read_at timestamptz,
  add column if not exists resolved_at timestamptz;

alter table public.contact_messages
  drop constraint if exists contact_messages_message_type_check;

alter table public.contact_messages
  add constraint contact_messages_message_type_check
  check (message_type in ('contact', 'report', 'advertising'));

alter table public.contact_messages
  drop constraint if exists contact_messages_status_check;

alter table public.contact_messages
  add constraint contact_messages_status_check
  check (status in ('new', 'read', 'resolved', 'spam'));

drop policy if exists contact_public_insert on public.contact_messages;
create policy contact_public_insert
on public.contact_messages
for insert
to anon, authenticated
with check (
  status = 'new'
  and message_type in ('contact', 'report', 'advertising')
  and char_length(btrim(name)) between 2 and 120
  and char_length(btrim(message)) between 10 and 4000
  and (email is null or char_length(email) <= 200)
  and (subject is null or char_length(subject) <= 180)
  and (phone is null or char_length(phone) <= 40)
  and (related_url is null or char_length(related_url) <= 1000)
);

revoke all on table public.contact_messages from anon;
grant insert on table public.contact_messages to anon;

create index if not exists contact_messages_status_created_idx
  on public.contact_messages (status, created_at desc);

create index if not exists contact_messages_type_created_idx
  on public.contact_messages (message_type, created_at desc);
