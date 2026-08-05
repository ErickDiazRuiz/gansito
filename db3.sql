-- ============================================================
--  GANSITO — migración 3
--  Plan de cultivo + modo nevera
--  Ejecutar DESPUÉS de db2.sql
-- ============================================================

alter table taskito.cultivos
  add column if not exists velocidad   int  not null default 1,   -- alimentaciones por día
  add column if not exists plan_dias   int  not null default 10,  -- duración del plan
  add column if not exists estado      text not null default 'desarrollo',
  add column if not exists guardado_en date,                      -- fecha en que entró a la nevera
  add column if not exists ultima_mant date;                      -- última alimentación de mantenimiento

do $$
begin
  alter table taskito.cultivos drop constraint if exists cultivos_estado_check;
  alter table taskito.cultivos
    add constraint cultivos_estado_check
    check (estado in ('desarrollo','activa','nevera'));
  alter table taskito.cultivos drop constraint if exists cultivos_velocidad_check;
  alter table taskito.cultivos
    add constraint cultivos_velocidad_check check (velocidad in (1,2));
end $$;

-- Marca las alimentaciones de mantenimiento en nevera
alter table taskito.registros
  add column if not exists mantenimiento boolean not null default false;

notify pgrst, 'reload schema';

select 'Listo. Recarga la web.' as resultado;
