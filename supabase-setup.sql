-- ================================================
-- WORKSPACE DEFINITIVO — Supabase Schema Setup
-- Execute este SQL no Supabase SQL Editor
-- ================================================

-- HÁBITOS
create table public.habitos (
  id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null default 'rec',
  done text[] not null default '{}',
  created_at text,
  primary key (id, user_id)
);
alter table public.habitos enable row level security;
create policy "habitos_policy" on public.habitos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- TAREFAS
create table public.tarefas (
  id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  prio text not null default 'media',
  prazo text,
  done boolean not null default false,
  created_at text,
  primary key (id, user_id)
);
alter table public.tarefas enable row level security;
create policy "tarefas_policy" on public.tarefas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- COMPRAS
create table public.compras (
  id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  cat text not null default 'outro',
  bought boolean not null default false,
  primary key (id, user_id)
);
alter table public.compras enable row level security;
create policy "compras_policy" on public.compras
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- FINANÇAS
create table public.financas (
  id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  descricao text not null,
  val numeric not null,
  tipo text not null default 'saida',
  cat text not null default 'outro',
  date text,
  primary key (id, user_id)
);
alter table public.financas enable row level security;
create policy "financas_policy" on public.financas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PROJETOS
create table public.projetos (
  id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  descricao text,
  cat text not null default 'trabalho',
  pct integer not null default 0,
  created_at text,
  primary key (id, user_id)
);
alter table public.projetos enable row level security;
create policy "projetos_policy" on public.projetos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SEGUNDO CÉREBRO
create table public.brain (
  id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  texto text not null,
  tag text not null default 'outro',
  date text,
  primary key (id, user_id)
);
alter table public.brain enable row level security;
create policy "brain_policy" on public.brain
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
