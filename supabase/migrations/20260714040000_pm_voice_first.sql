-- =============================================================================
-- VOICE-FIRST v0.2 — note vocali + entities + checklist nel Manager Personale
-- Mappa su aree_vita (già esistenti): voice_notes.area_slug, non categories.
-- Soft-delete, RLS, trigger updated_at, FK esplicite. Seed entities fuori.
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Note vocali personali ────────────────────────────────────────────────────
create table if not exists public.pm_voice_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Area Wheel of Life (opzionale): allineata agli slug di aree_vita
  area_slug text check (
    area_slug is null
    or area_slug in (
      'career','finance','family','health','fun','friends','growth','spiritual'
    )
  ),
  status text not null default 'pending'
    check (status in ('pending', 'transcribing', 'processing', 'ready', 'error')),
  audio_path text,
  transcription text,
  summary text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.pm_voice_notes is
  'Note vocali del Manager Personale (Voice-First). Soft-delete.';

create index if not exists pm_voice_notes_user_id_idx
  on public.pm_voice_notes (user_id);
create index if not exists pm_voice_notes_created_at_idx
  on public.pm_voice_notes (user_id, created_at desc);

drop trigger if exists pm_voice_notes_set_updated_at on public.pm_voice_notes;
create trigger pm_voice_notes_set_updated_at
  before update on public.pm_voice_notes
  for each row execute function public.set_updated_at();

alter table public.pm_voice_notes enable row level security;

drop policy if exists "pm_voice_notes_select_own" on public.pm_voice_notes;
create policy "pm_voice_notes_select_own"
  on public.pm_voice_notes for select using (user_id = auth.uid());

drop policy if exists "pm_voice_notes_insert_own" on public.pm_voice_notes;
create policy "pm_voice_notes_insert_own"
  on public.pm_voice_notes for insert with check (user_id = auth.uid());

drop policy if exists "pm_voice_notes_update_own" on public.pm_voice_notes;
create policy "pm_voice_notes_update_own"
  on public.pm_voice_notes for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pm_voice_notes_delete_own" on public.pm_voice_notes;
create policy "pm_voice_notes_delete_own"
  on public.pm_voice_notes for delete using (user_id = auth.uid());

-- ── Entità (progetti / persone / aziende) ────────────────────────────────────
create table if not exists public.pm_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('progetto', 'persona', 'azienda')),
  aliases text[] not null default '{}',
  area_slug text check (
    area_slug is null
    or area_slug in (
      'career','finance','family','health','fun','friends','growth','spiritual'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.pm_entities is
  'Entità personali per etichettare checklist da note vocali.';

create index if not exists pm_entities_user_id_idx on public.pm_entities (user_id);

drop trigger if exists pm_entities_set_updated_at on public.pm_entities;
create trigger pm_entities_set_updated_at
  before update on public.pm_entities
  for each row execute function public.set_updated_at();

alter table public.pm_entities enable row level security;

drop policy if exists "pm_entities_select_own" on public.pm_entities;
create policy "pm_entities_select_own"
  on public.pm_entities for select using (user_id = auth.uid());

drop policy if exists "pm_entities_insert_own" on public.pm_entities;
create policy "pm_entities_insert_own"
  on public.pm_entities for insert with check (user_id = auth.uid());

drop policy if exists "pm_entities_update_own" on public.pm_entities;
create policy "pm_entities_update_own"
  on public.pm_entities for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pm_entities_delete_own" on public.pm_entities;
create policy "pm_entities_delete_own"
  on public.pm_entities for delete using (user_id = auth.uid());

-- ── Checklist items ──────────────────────────────────────────────────────────
create table if not exists public.pm_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  voice_note_id uuid not null references public.pm_voice_notes(id) on delete cascade,
  entity_id uuid references public.pm_entities(id) on delete set null,
  label text not null,
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.pm_checklist_items is
  'Checklist informativa generata da process-note; nessuna esecuzione automatica.';

create index if not exists pm_checklist_items_user_id_idx
  on public.pm_checklist_items (user_id);
create index if not exists pm_checklist_items_voice_note_id_idx
  on public.pm_checklist_items (voice_note_id);

drop trigger if exists pm_checklist_items_set_updated_at on public.pm_checklist_items;
create trigger pm_checklist_items_set_updated_at
  before update on public.pm_checklist_items
  for each row execute function public.set_updated_at();

alter table public.pm_checklist_items enable row level security;

drop policy if exists "pm_checklist_items_select_own" on public.pm_checklist_items;
create policy "pm_checklist_items_select_own"
  on public.pm_checklist_items for select using (user_id = auth.uid());

drop policy if exists "pm_checklist_items_insert_own" on public.pm_checklist_items;
create policy "pm_checklist_items_insert_own"
  on public.pm_checklist_items for insert with check (user_id = auth.uid());

drop policy if exists "pm_checklist_items_update_own" on public.pm_checklist_items;
create policy "pm_checklist_items_update_own"
  on public.pm_checklist_items for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pm_checklist_items_delete_own" on public.pm_checklist_items;
create policy "pm_checklist_items_delete_own"
  on public.pm_checklist_items for delete using (user_id = auth.uid());

-- ── Azioni in attesa di conferma (guardrail) ─────────────────────────────────
create table if not exists public.pm_pending_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  voice_note_id uuid references public.pm_voice_notes(id) on delete cascade,
  label text not null,
  payload jsonb not null default '{}',
  needs_confirmation boolean not null default true,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists pm_pending_actions_user_id_idx
  on public.pm_pending_actions (user_id);

drop trigger if exists pm_pending_actions_set_updated_at on public.pm_pending_actions;
create trigger pm_pending_actions_set_updated_at
  before update on public.pm_pending_actions
  for each row execute function public.set_updated_at();

alter table public.pm_pending_actions enable row level security;

drop policy if exists "pm_pending_actions_select_own" on public.pm_pending_actions;
create policy "pm_pending_actions_select_own"
  on public.pm_pending_actions for select using (user_id = auth.uid());

drop policy if exists "pm_pending_actions_insert_own" on public.pm_pending_actions;
create policy "pm_pending_actions_insert_own"
  on public.pm_pending_actions for insert with check (user_id = auth.uid());

drop policy if exists "pm_pending_actions_update_own" on public.pm_pending_actions;
create policy "pm_pending_actions_update_own"
  on public.pm_pending_actions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pm_pending_actions_delete_own" on public.pm_pending_actions;
create policy "pm_pending_actions_delete_own"
  on public.pm_pending_actions for delete using (user_id = auth.uid());

-- ── Storage audio (bucket privato) ───────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('pm-voice-notes', 'pm-voice-notes', false)
on conflict (id) do nothing;

drop policy if exists "pm_voice_notes_storage_select_own" on storage.objects;
create policy "pm_voice_notes_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'pm-voice-notes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "pm_voice_notes_storage_insert_own" on storage.objects;
create policy "pm_voice_notes_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'pm-voice-notes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pm_voice_notes'
  ) then
    alter publication supabase_realtime add table public.pm_voice_notes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pm_checklist_items'
  ) then
    alter publication supabase_realtime add table public.pm_checklist_items;
  end if;
end;
$$;
