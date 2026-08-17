-- ============================================================
--  GANSITO — migración 5
--  Suscripciones de notificaciones push
--  Ejecutar DESPUÉS de db4.sql
-- ============================================================

create schema if not exists gansito;
grant usage on schema gansito to anon, authenticated;

create table if not exists gansito.push_subs (
  id         bigserial primary key,
  user_id    uuid not null default auth.uid(),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  etiqueta   text,                    -- 'móvil', 'portátil'…
  created_at timestamptz not null default now(),
  ultimo_ok  timestamptz
);

alter table gansito.push_subs enable row level security;
drop policy if exists solo_yo on gansito.push_subs;
create policy solo_yo on gansito.push_subs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on gansito.push_subs to authenticated;
grant usage, select on all sequences in schema gansito to authenticated;

-- ============================================================
--  Vista de pendientes: la lee el cron con la service_role key.
--  Calcula la próxima fecha igual que la app: desde el último log
--  si existe, y si no desde la fecha ancla del aparato.
-- ============================================================
create or replace view gansito.v_pendientes as
select
  t.user_id,
  a.nombre  as aparato,
  t.nombre  as tarea,
  t.freq_dias,
  coalesce(
    (select max(l.fecha)::date from gansirato.log l where l.tarea_id = t.id),
    a.fecha_ancla
  ) as ultima,
  case
    when (select max(l.fecha) from gansirato.log l where l.tarea_id = t.id) is not null
      then (select max(l.fecha)::date from gansirato.log l where l.tarea_id = t.id) + t.freq_dias
    else a.fecha_ancla + t.freq_dias *
      ceil(greatest(current_date - a.fecha_ancla, 0)::numeric / t.freq_dias)::int
  end as proxima
from gansirato.tareas t
join gansirato.aparatos a on a.id = t.aparato_id
where t.bajo_demanda = false
  and t.freq_dias is not null
  and a.activo = true;

grant select on gansito.v_pendientes to authenticated, service_role;

notify pgrst, 'reload schema';

select 'Listo. Añade gansito a Exposed schemas.' as resultado;
