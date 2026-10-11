-- Data para retornar o contato com o lead (ex.: "me liga semana que vem").
alter table public.leads add column if not exists proximo_contato date;

create index if not exists leads_user_retorno_idx on public.leads (user_id, proximo_contato);
