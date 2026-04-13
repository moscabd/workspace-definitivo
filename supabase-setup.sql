-- ================================================
-- WORKSPACE DEFINITIVO — Supabase Schema Setup
-- Execute este SQL no Supabase SQL Editor
-- ================================================

-- HÁBITOS
CREATE TABLE IF NOT EXISTS public.habitos (
  id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null default 'rec',
  done text[] not null default '{}',
  created_at text,
  primary key (id, user_id)
);
ALTER TABLE public.habitos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habitos_policy" ON public.habitos;
CREATE POLICY "habitos_policy" ON public.habitos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TAREFAS
CREATE TABLE IF NOT EXISTS public.tarefas (
  id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  prio text not null default 'media',
  prazo text,
  done boolean not null default false,
  is_daily boolean not null default false,
  seq integer not null default 0,
  created_at text,
  primary key (id, user_id)
);
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tarefas_policy" ON public.tarefas;
CREATE POLICY "tarefas_policy" ON public.tarefas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- COMPRAS
CREATE TABLE IF NOT EXISTS public.compras (
  id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  cat text not null default 'outro',
  bought boolean not null default false,
  primary key (id, user_id)
);
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "compras_policy" ON public.compras;
CREATE POLICY "compras_policy" ON public.compras
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FINANÇAS
CREATE TABLE IF NOT EXISTS public.financas (
  id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  descricao text not null,
  val numeric not null,
  tipo text not null default 'saida',
  cat text not null default 'outro',
  date text,
  primary key (id, user_id)
);
ALTER TABLE public.financas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "financas_policy" ON public.financas;
CREATE POLICY "financas_policy" ON public.financas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PROJETOS (com notas e todo)
CREATE TABLE IF NOT EXISTS public.projetos (
  id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  descricao text,
  cat text not null default 'trabalho',
  pct integer not null default 0,
  notas text DEFAULT '',
  rascunhos text DEFAULT '',
  plano text DEFAULT '',
  todo jsonb DEFAULT '[]'::jsonb,
  created_at text,
  primary key (id, user_id)
);
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projetos_policy" ON public.projetos;
CREATE POLICY "projetos_policy" ON public.projetos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SEGUNDO CÉREBRO
CREATE TABLE IF NOT EXISTS public.brain (
  id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  texto text not null,
  tag text not null default 'outro',
  date text,
  primary key (id, user_id)
);
ALTER TABLE public.brain ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brain_policy" ON public.brain;
CREATE POLICY "brain_policy" ON public.brain
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ================================================
-- SUCESSO! Execute "Run" para criar/atualizar tudo
-- ================================================
