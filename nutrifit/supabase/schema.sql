-- =====================================================================
-- NutriFit · Esquema para Supabase (PostgreSQL)
-- Pégalo completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Es idempotente: puedes ejecutarlo más de una vez sin romper nada.
-- =====================================================================

-- 1) METAS (una sola fila: app de uso personal) ------------------------
create table if not exists public.metas_usuario (
  id              smallint primary key default 1 check (id = 1),
  edad            smallint        check (edad between 10 and 100),
  peso            numeric(5,2)    check (peso > 0),
  altura          numeric(5,1)    check (altura > 0),
  sexo            text            check (sexo in ('hombre','mujer')),
  nivel_actividad text            check (nivel_actividad in
                    ('sedentario','ligero','moderado','alto','muy_alto')),
  objetivo        text            check (objetivo in
                    ('volumen','definicion','mantenimiento')),
  modo_manual     boolean         not null default false,
  meta_calorias   integer         check (meta_calorias >= 0),
  meta_proteina   integer         check (meta_proteina >= 0),
  meta_carbos     integer         check (meta_carbos   >= 0),
  meta_grasas     integer         check (meta_grasas   >= 0),
  updated_at      timestamptz     not null default now()
);

-- 2) COMIDAS -----------------------------------------------------------
create table if not exists public.registros_comidas (
  id             uuid primary key default gen_random_uuid(),
  fecha          date          not null,
  tipo_comida    text,
  nombre_plato   text          not null,
  calorias       numeric(7,1)  not null default 0,
  proteina       numeric(6,1)  not null default 0,
  carbohidratos  numeric(6,1)  not null default 0,
  grasas         numeric(6,1)  not null default 0,
  created_at     timestamptz   not null default now()
);
create index if not exists idx_registros_comidas_fecha
  on public.registros_comidas (fecha desc);

-- 3) EJERCICIOS --------------------------------------------------------
create table if not exists public.registros_ejercicios (
  id                 uuid primary key default gen_random_uuid(),
  fecha              date         not null,
  tipo_ejercicio     text         not null,
  duracion_min       integer      not null check (duracion_min > 0),
  calorias_quemadas  integer      not null default 0 check (calorias_quemadas >= 0),
  created_at         timestamptz  not null default now()
);
create index if not exists idx_registros_ejercicios_fecha
  on public.registros_ejercicios (fecha desc);

-- 4) SEGURIDAD (RLS) ---------------------------------------------------
-- App personal SIN login: se habilita RLS y se permite acceso con la
-- anon key. Quien tenga tu anon key podría leer/escribir estas tablas.
-- Para uso personal (key solo en tu .env) es aceptable; si quieres
-- blindarlo, agrega Supabase Auth y limita las políticas a auth.uid().
alter table public.metas_usuario        enable row level security;
alter table public.registros_comidas    enable row level security;
alter table public.registros_ejercicios enable row level security;

drop policy if exists "acceso_personal" on public.metas_usuario;
create policy "acceso_personal" on public.metas_usuario
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "acceso_personal" on public.registros_comidas;
create policy "acceso_personal" on public.registros_comidas
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "acceso_personal" on public.registros_ejercicios;
create policy "acceso_personal" on public.registros_ejercicios
  for all to anon, authenticated using (true) with check (true);
