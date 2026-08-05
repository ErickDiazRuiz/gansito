-- ============================================================
--  GANSITO — migración 2
--  Ejecutar DESPUÉS de db.sql, en SQL Editor → New query
--
--  Qué hace:
--   1. El esquema 'taskito' (aparatos, tareas, log) pasa a 'gansirato'
--   2. Crea un 'taskito' nuevo para procesos vivos: masa madre
-- ============================================================

do $$
declare
  MI_UID uuid := '78ab225d-31e2-4541-b806-0e5bd0fa0c21';
begin
  if MI_UID = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Falta poner tu UUID en MI_UID (línea 11)';
  end if;
  perform set_config('gansito.uid', MI_UID::text, false);
end $$;


-- ============================================================
--  1. RENOMBRAR taskito → gansirato
-- ============================================================
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'taskito')
     and not exists (select 1 from pg_namespace where nspname = 'gansirato') then
    alter schema taskito rename to gansirato;
  end if;
end $$;

grant usage on schema gansirato to anon, authenticated;


-- ============================================================
--  2. NUEVO ESQUEMA taskito — procesos vivos
-- ============================================================
create schema if not exists taskito;
grant usage on schema taskito to anon, authenticated;

-- Un cultivo = una masa madre en marcha
create table if not exists taskito.cultivos (
  id           bigserial primary key,
  user_id      uuid not null default auth.uid(),
  nombre       text not null default 'Masa madre',
  harina       text not null default 'Trigo panificable',
  hidratacion  int  not null default 100,          -- % agua/harina
  ratio        text not null default '1:1:1',      -- starter:harina:agua
  inicio       date not null default current_date,
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Cada observación del lazo de control
create table if not exists taskito.registros (
  id             bigserial primary key,
  user_id        uuid not null default auth.uid(),
  cultivo_id     bigint not null references taskito.cultivos(id) on delete cascade,
  fecha          timestamptz not null default now(),
  factor         numeric(4,2),        -- factor de expansión observado (2.0 = duplicó)
  horas_pico     numeric(4,1),        -- horas desde alimentar hasta el pico
  temperatura    numeric(4,1),        -- °C ambiente durante la fermentación
  olor           text check (olor in ('acido-frutal','neutro','queso','acetona','podrido')),
  alimentado     boolean not null default false,
  flota          boolean,
  nota           text
);

create index if not exists registros_cultivo_idx on taskito.registros (cultivo_id, fecha desc);


-- ============================================================
--  3. user_id + RLS en las tablas nuevas
-- ============================================================
do $$
declare
  t text;
  uid uuid := current_setting('gansito.uid')::uuid;
  tablas text[] := array['taskito.cultivos','taskito.registros'];
begin
  foreach t in array tablas loop
    execute format('update %s set user_id = %L where user_id is null', t, uid);
    execute format('alter table %s enable row level security', t);
    execute format('drop policy if exists solo_yo on %s', t);
    execute format($f$
      create policy solo_yo on %s
      for all to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid())
    $f$, t);
    execute format('grant select, insert, update, delete on %s to authenticated', t);
  end loop;
  execute 'grant usage, select on all sequences in schema taskito to authenticated';
  execute 'grant usage, select on all sequences in schema gansirato to authenticated';
end $$;


-- ============================================================
--  4. SEED — un cultivo para empezar
-- ============================================================
do $$
declare uid uuid := current_setting('gansito.uid')::uuid;
begin
  if not exists (select 1 from taskito.cultivos where user_id = uid) then
    insert into taskito.cultivos (user_id, nombre, harina, hidratacion, ratio, inicio)
    values (uid, 'Masa madre', 'Trigo panificable', 100, '1:1:1', current_date);
  end if;
end $$;

notify pgrst, 'reload schema';

-- ============================================================
--  DESPUÉS DE EJECUTAR:
--  Settings → Data API → Exposed schemas
--  La lista debe quedar: public, graphql_public, cashito, gansirato, taskito, plansito
--  (añade 'gansirato'; 'taskito' ya estaba)
-- ============================================================
select 'Listo. Añade gansirato a Exposed schemas.' as resultado;
