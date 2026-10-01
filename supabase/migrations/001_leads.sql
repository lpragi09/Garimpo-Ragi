-- Leads garimpados. Cada linha pertence a quem salvou (user_id) e o RLS
-- garante que ninguém lê nem mexe nos leads de outra conta.

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id    text not null,
  nome        text not null check (char_length(nome) <= 200),
  nicho       text,
  cidade      text,
  categoria   text,
  endereco    text,
  telefone    text,
  site        text,
  presenca    text not null default 'sem_site' check (presenca in ('sem_site', 'rede_social', 'tem_site')),
  nota        numeric(2, 1),
  avaliacoes  integer not null default 0,
  maps_url    text,
  status      text not null default 'novo'
              check (status in ('novo', 'contatado', 'negociando', 'fechado', 'perdido')),
  observacao  text check (char_length(observacao) <= 4000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, place_id)
);

create index if not exists leads_user_status_idx on public.leads (user_id, status);

create or replace function public.leads_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.leads_touch();

alter table public.leads enable row level security;

-- Só usuários logados, e só nas próprias linhas. anon não tem nenhuma policy = nada.
drop policy if exists "leads_select_own" on public.leads;
drop policy if exists "leads_insert_own" on public.leads;
drop policy if exists "leads_update_own" on public.leads;
drop policy if exists "leads_delete_own" on public.leads;

create policy "leads_select_own" on public.leads
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "leads_insert_own" on public.leads
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "leads_update_own" on public.leads
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "leads_delete_own" on public.leads
  for delete to authenticated using ((select auth.uid()) = user_id);
