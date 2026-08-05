-- ============================================================
--  GANSITO — migración completa
--  Supabase → SQL Editor → New query → pegar → Run
--
--  ANTES DE EJECUTAR:
--  1. Crea tu usuario en Authentication → Users → Add user
--     (email + password, marca "Auto Confirm User")
--  2. Copia su UUID y pégalo abajo en MI_UID
--  3. Haz un backup: Database → Backups (o exporta gastos a CSV)
-- ============================================================

do $$
declare
  MI_UID uuid := '00000000-0000-0000-0000-000000000000';  -- ← PEGA TU UUID AQUÍ
begin
  if MI_UID = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Falta poner tu UUID en MI_UID (línea 16)';
  end if;
  perform set_config('gansito.uid', MI_UID::text, false);
end $$;


-- ============================================================
--  1. ESQUEMAS
-- ============================================================
create schema if not exists cashito;
create schema if not exists taskito;
create schema if not exists plansito;

grant usage on schema cashito, taskito, plansito to anon, authenticated;


-- ============================================================
--  2. MOVER LAS TABLAS DE CASHITO QUE YA EXISTEN
-- ============================================================
do $$
begin
  if to_regclass('public.gastos')       is not null then alter table public.gastos       set schema cashito; end if;
  if to_regclass('public.ingresos')     is not null then alter table public.ingresos     set schema cashito; end if;
  if to_regclass('public.gastos_fijos') is not null then alter table public.gastos_fijos set schema cashito; end if;
  if to_regclass('public.items')        is not null then alter table public.items        set schema cashito; end if;
  if to_regclass('public.presupuesto')  is not null then alter table public.presupuesto  set schema cashito; end if;
end $$;

-- Por si 'ingresos' nunca se creó con SQL (se hizo a mano desde el bot)
create table if not exists cashito.ingresos (
  id          bigserial primary key,
  monto       numeric(10,2) not null,
  descripcion text,
  fecha       timestamptz not null default now()
);

-- Renombrar 'activo' → 'activo' ya está bien; asegurar columnas que el bot creó a mano
alter table cashito.gastos add column if not exists item_nombre text;
alter table cashito.gastos add column if not exists item_tipo   text;
alter table cashito.gastos add column if not exists item_id     bigint;


-- ============================================================
--  3. LIMPIEZA DE CASHITO
-- ============================================================

-- 3a. Columnas muertas (el flujo pedía el total, nunca las llenó)
alter table cashito.gastos drop column if exists unidades;
alter table cashito.gastos drop column if exists precio_unidad;

-- 3b. item_tipo: el bot guardaba 'necesidad'/'gusto' pero el código leía
--     'essential'/'treat', así que el split nunca funcionó. Unificamos en
--     español: 'basico' / 'gusto'.
alter table cashito.gastos drop constraint if exists gastos_item_tipo_check;

update cashito.gastos set item_tipo = 'basico'
  where item_tipo in ('necesidad','essential','necesidad ');
update cashito.gastos set item_tipo = 'gusto'
  where item_tipo in ('treat','gusto ');
update cashito.gastos set item_tipo = null
  where item_tipo is not null and item_tipo not in ('basico','gusto');

alter table cashito.gastos
  add constraint gastos_item_tipo_check check (item_tipo in ('basico','gusto'));


-- ============================================================
--  4. TASKITO — multiaparato
-- ============================================================
create table if not exists taskito.aparatos (
  id          bigserial primary key,
  user_id     uuid not null default auth.uid(),
  nombre      text not null,
  modelo      text,
  icono       text not null default 'box',
  fecha_ancla date not null default current_date,
  activo      boolean not null default true,
  orden       int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists taskito.tareas (
  id            bigserial primary key,
  user_id       uuid not null default auth.uid(),
  aparato_id    bigint not null references taskito.aparatos(id) on delete cascade,
  clave         text not null,
  nombre        text not null,
  freq_dias     int,                     -- null = bajo demanda
  producto      text,                    -- código del consumible
  instrucciones text,
  bajo_demanda  boolean not null default false,
  orden         int not null default 0,
  unique (aparato_id, clave)
);

create table if not exists taskito.log (
  id       bigserial primary key,
  user_id  uuid not null default auth.uid(),
  tarea_id bigint not null references taskito.tareas(id) on delete cascade,
  fecha    timestamptz not null default now(),
  nota     text
);

create table if not exists taskito.consumibles (
  id         bigserial primary key,
  user_id    uuid not null default auth.uid(),
  aparato_id bigint not null references taskito.aparatos(id) on delete cascade,
  codigo     text not null,
  nombre     text not null,
  stock      int not null default 0 check (stock >= 0),
  unique (aparato_id, codigo)
);

create table if not exists taskito.videos (
  id           bigserial primary key,
  user_id      uuid not null default auth.uid(),
  tarea_id     bigint references taskito.tareas(id) on delete cascade,
  titulo       text not null,
  storage_path text not null
);

create index if not exists log_tarea_idx on taskito.log (tarea_id, fecha desc);


-- ============================================================
--  5. PLANSITO
-- ============================================================
create table if not exists plansito.planes (
  id             bigserial primary key,
  user_id        uuid not null default auth.uid(),
  titulo         text not null,
  notas          text,
  estado         text not null default 'idea' check (estado in ('idea','curso','hecho','desc')),
  categoria      text not null default 'Sin categoría',
  coste_estimado numeric(10,2),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists plansito.materiales (
  id       bigserial primary key,
  user_id  uuid not null default auth.uid(),
  plan_id  bigint not null references plansito.planes(id) on delete cascade,
  nombre   text not null,
  cantidad numeric(10,2) default 1,
  coste    numeric(10,2),
  comprado boolean not null default false
);


-- ============================================================
--  6. user_id EN TODO + BACKFILL
-- ============================================================
do $$
declare
  t text;
  uid uuid := current_setting('gansito.uid')::uuid;
  tablas text[] := array[
    'cashito.gastos','cashito.ingresos','cashito.gastos_fijos',
    'cashito.items','cashito.presupuesto',
    'taskito.aparatos','taskito.tareas','taskito.log',
    'taskito.consumibles','taskito.videos',
    'plansito.planes','plansito.materiales'
  ];
begin
  foreach t in array tablas loop
    execute format('alter table %s add column if not exists user_id uuid', t);
    execute format('update %s set user_id = %L where user_id is null', t, uid);
    execute format('alter table %s alter column user_id set default auth.uid()', t);
    execute format('alter table %s alter column user_id set not null', t);
    execute format('create index if not exists %s_uid_idx on %s (user_id)',
                   replace(t,'.','_'), t);
  end loop;
end $$;


-- ============================================================
--  7. ROW LEVEL SECURITY
--     Sin esto, cualquiera con la anon key lee todos tus gastos.
-- ============================================================
do $$
declare
  t text;
  tablas text[] := array[
    'cashito.gastos','cashito.ingresos','cashito.gastos_fijos',
    'cashito.items','cashito.presupuesto',
    'taskito.aparatos','taskito.tareas','taskito.log',
    'taskito.consumibles','taskito.videos',
    'plansito.planes','plansito.materiales'
  ];
begin
  foreach t in array tablas loop
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
end $$;

do $$
declare s text;
begin
  foreach s in array array['cashito','taskito','plansito'] loop
    execute format('grant usage, select on all sequences in schema %I to authenticated', s);
  end loop;
end $$;


-- ============================================================
--  8. SEED — Philips EP3300
--     Migra el cronograma que estaba incrustado en el código Python.
-- ============================================================
do $$
declare
  uid uuid := current_setting('gansito.uid')::uuid;
  ap_id bigint;
begin
  if exists (select 1 from taskito.aparatos where user_id = uid) then
    raise notice 'Taskito ya tiene aparatos, no se hace seed.';
    return;
  end if;

  insert into taskito.aparatos (user_id, nombre, modelo, icono, fecha_ancla, orden)
  values (uid, 'Philips EP3300', 'Cafetera espresso', 'coffee', '2026-06-05', 1)
  returning id into ap_id;

  insert into taskito.tareas (user_id, aparato_id, clave, nombre, freq_dias, producto, orden, instrucciones) values
  (uid, ap_id, 'grupo', 'Grupo de preparación', 7, null, 1,
E'1. Apaga la máquina.\n2. Quita el depósito de agua y abre la puerta de mantenimiento.\n3. Presiona PUSH y tira del asa para sacar el grupo.\n4. Enjuaga solo con agua bajo el grifo.\n5. Limpia bien el filtro superior.\n6. Deja secar al aire — sin paño, sin jabón.'),
  (uid, ap_id, 'deposito', 'Depósito de agua', 7, null, 2,
E'1. Saca el depósito de agua.\n2. Enjuágalo bien bajo el grifo con agua limpia.\n3. Vuelve a colocarlo empujando hasta el fondo.'),
  (uid, ap_id, 'posos', 'Recipiente de posos', 7, null, 3,
E'1. Con la máquina encendida, saca el recipiente de posos.\n2. Vacíalo y lávalo con detergente o en lavavajillas.\n⚠ El panel frontal NO va al lavavajillas.\n3. Espera 5 segundos antes de reinsertar (el contador se reinicia).'),
  (uid, ap_id, 'molido', 'Compartimento de café molido', 7, null, 4,
E'1. Revisa que no esté atascado.\n2. Si lo está: introduce el mango de la cuchara dosificadora y muévelo arriba y abajo hasta que caiga el café.\n3. Retira el grupo de preparación y quita el café caído.'),
  (uid, ap_id, 'pastilla', 'Pastilla desengrasante', 30, 'CA6704', 5,
E'1. Taza bajo la boquilla, depósito con agua limpia.\n2. Pastilla en el compartimento de café molido.\n3. Icono de café → mantén 3 s el icono de intensidad (función café molido). No agregues café.\n4. Inicio/parada. A media taza, desenchufa la máquina.\n5. Espera 15 minutos.\n6. Enchufa, enciende y termina el ciclo. Vacía la taza.\n7. Saca el grupo de preparación y enjuágalo bien.\n8. Reinstala y haz 2 ciclos más de café molido sin café.'),
  (uid, ap_id, 'grasa', 'Lubricar grupo de preparación', 60, 'HD5061', 6,
E'Aplica una capa fina de grasa en:\n• El pistón (parte gris) del grupo de preparación\n• El eje (parte gris) de la parte inferior\n• Los raíles de ambos lados\n\nSi la máquina hace ruidos raros antes de la fecha, lubrica igual.'),
  (uid, ap_id, 'filtro', 'Cambiar filtro AquaClean', 90, 'CA6903', 7,
E'1. Saca el filtro viejo del depósito.\n2. Prepara el nuevo: sacúdelo 5 s, sumérgelo boca abajo en agua fría y agítalo/presiónalo (si no, entra aire → ruido y no sale café).\n3. Insértalo vertical en la conexión del depósito, presiona a fondo.\n4. Llena el depósito y colócalo. Quita el LatteGo si está puesto.\n5. Bol bajo la boquilla de agua caliente.\n6. Mantén el icono AquaClean 3 s → pulsa inicio/parada.\n7. Dispensa agua ~3 min. Piloto azul fijo = filtro activado.\n\n⚠ Si el piloto naranja parpadea, cámbialo aunque no toque por fecha (95 L).');

  insert into taskito.tareas (user_id, aparato_id, clave, nombre, freq_dias, producto, bajo_demanda, orden, instrucciones) values
  (uid, ap_id, 'descal', 'Descalcificación', null, 'CA6700', true, 8,
E'⚠ OBLIGATORIA cuando se enciende el piloto Calc/Clean. No hacerla anula la garantía. Solo descalcificador Philips.\n\n1. Máquina encendida. Quita LatteGo/espumador.\n2. Vacía bandeja de goteo y recipiente de posos; recolócalos.\n3. Vacía el depósito y quita el filtro AquaClean.\n4. Vierte toda la botella CA6700 + agua hasta la marca Calc/Clean.\n5. Recipiente grande (1,5 L) bajo las boquillas.\n6. Mantén Calc/Clean 3 s → inicio/parada. Fase 1 en marcha.\n7. Cuando pida: vacía el depósito, enjuágalo, agua hasta Calc/Clean.\n8. Vacía el recipiente, recolócalo → inicio/parada. Fase 2: enjuague (3 min).\n9. Espera a que deje de dispensar. La máquina se recalienta sola.\n10. Instala y activa un filtro AquaClean nuevo.');

  insert into taskito.consumibles (user_id, aparato_id, codigo, nombre, stock) values
  (uid, ap_id, 'CA6704', 'Pastillas desengrasantes', 0),
  (uid, ap_id, 'HD5061', 'Grasa para grupo', 0),
  (uid, ap_id, 'CA6903', 'Filtro AquaClean', 0),
  (uid, ap_id, 'CA6700', 'Descalcificador', 0);
end $$;


-- ============================================================
--  9. STORAGE — bucket privado para los videos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('taskito-videos', 'taskito-videos', false)
on conflict (id) do nothing;

drop policy if exists taskito_videos_rw on storage.objects;
create policy taskito_videos_rw on storage.objects
  for all to authenticated
  using (bucket_id = 'taskito-videos' and owner = auth.uid())
  with check (bucket_id = 'taskito-videos' and owner = auth.uid());


-- ============================================================
--  LISTO
--  Último paso obligatorio, fuera del SQL:
--  Settings → API → Exposed schemas → añade: cashito, taskito, plansito
--  Sin eso, PostgREST devuelve 404 en todas las tablas.
-- ============================================================
select 'Migración completa. Recuerda exponer los esquemas en Settings → API.' as resultado;
