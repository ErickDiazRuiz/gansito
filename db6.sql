-- ============================================================
--  GANSITO — migración 6
--  Chefcito: recetario
--  Ejecutar DESPUÉS de db5.sql
-- ============================================================

do $$
declare
  MI_UID uuid := '78ab225d-31e2-4541-b806-0e5bd0fa0c21';
begin
  perform set_config('gansito.uid', MI_UID::text, false);
end $$;

create schema if not exists chefcito;
grant usage on schema chefcito to anon, authenticated, service_role;

-- ── Categorías propias ──
create table if not exists chefcito.categorias (
  id      bigserial primary key,
  user_id uuid not null default auth.uid(),
  nombre  text not null,
  color   text not null default '#9E9B93',
  orden   int  not null default 0,
  unique (user_id, nombre)
);

-- ── Recetas ──
create table if not exists chefcito.recetas (
  id           bigserial primary key,
  user_id      uuid not null default auth.uid(),
  titulo       text not null,
  categoria_id bigint references chefcito.categorias(id) on delete set null,
  imagen       text,                                   -- ruta en Storage
  porciones    numeric(5,1) not null default 1,        -- rinde N
  unidad_rinde text not null default 'porciones',      -- 'porciones', 'días', 'vasos'…
  tiempo_min   int,                                    -- minutos de preparación
  preparacion  text,
  notas        text,
  favorita     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Ingredientes: cantidad separada del nombre para poder escalar ──
create table if not exists chefcito.ingredientes (
  id        bigserial primary key,
  user_id   uuid not null default auth.uid(),
  receta_id bigint not null references chefcito.recetas(id) on delete cascade,
  cantidad  numeric(8,2),           -- null = "al gusto"
  unidad    text,                   -- g, ml, cda, cdta, u, taza…
  nombre    text not null,
  nota      text,                   -- "picado fino", "opcional"
  orden     int not null default 0
);

create index if not exists ing_receta_idx on chefcito.ingredientes (receta_id, orden);
create index if not exists rec_cat_idx    on chefcito.recetas (categoria_id);

-- ── user_id + RLS ──
do $$
declare
  t text;
  uid uuid := current_setting('gansito.uid')::uuid;
  tablas text[] := array['chefcito.categorias','chefcito.recetas','chefcito.ingredientes'];
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
  execute 'grant usage, select on all sequences in schema chefcito to authenticated';
end $$;

-- ── Categorías de partida ──
do $$
declare uid uuid := current_setting('gansito.uid')::uuid;
begin
  if not exists (select 1 from chefcito.categorias where user_id = uid) then
    insert into chefcito.categorias (user_id, nombre, color, orden) values
      (uid, 'Desayuno',     '#F4A261', 1),
      (uid, 'Almuerzo',     '#52B788', 2),
      (uid, 'Cena',         '#4A9FD8', 3),
      (uid, 'Entrecomidas', '#E9C46A', 4),
      (uid, 'Bebidas',      '#6BC5C5', 5),
      (uid, 'Postres',      '#E76F8F', 6),
      (uid, 'Panadería',    '#8B7DDB', 7);
  end if;
end $$;

-- ── Storage para las fotos ──
insert into storage.buckets (id, name, public)
values ('chefcito-fotos', 'chefcito-fotos', false)
on conflict (id) do nothing;

drop policy if exists chefcito_fotos_rw on storage.objects;
create policy chefcito_fotos_rw on storage.objects
  for all to authenticated
  using (bucket_id = 'chefcito-fotos')
  with check (bucket_id = 'chefcito-fotos');

notify pgrst, 'reload schema';

-- ============================================================
--  DESPUÉS: Settings → Data API → Exposed schemas → añade 'chefcito'
-- ============================================================
select 'Listo. Añade chefcito a Exposed schemas.' as resultado;
