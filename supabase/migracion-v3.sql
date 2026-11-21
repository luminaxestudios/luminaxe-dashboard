-- Migración CRM Luminaxe v3: reparto automático entre Rafael y Gonzalo
-- Solo añade una función y un disparador, y reparte los contactos que están sin responsable.
-- No borra nada. Se puede ejecutar más de una vez.

-- 1) Cada inmobiliaria nueva (sin responsable y sin contactar) entra al que tenga menos "sin contactar".
--    Empate: Rafael. Las descartadas no se reparten.
create or replace function public.asignar_responsable()
returns trigger language plpgsql as $$
declare
  n_rafael integer;
  n_gonzalo integer;
begin
  if new.responsable is null
     and coalesce(new.estado, '') <> 'descartada'
     and coalesce(new.etapa, 'sin_contactar') = 'sin_contactar' then
    select count(*) into n_rafael from public.inmobiliarias
      where responsable = 'rafael' and etapa = 'sin_contactar';
    select count(*) into n_gonzalo from public.inmobiliarias
      where responsable = 'gonzalo' and etapa = 'sin_contactar';
    new.responsable := case when n_gonzalo < n_rafael then 'gonzalo' else 'rafael' end;
  end if;
  return new;
end $$;

drop trigger if exists trg_asignar_responsable on public.inmobiliarias;
create trigger trg_asignar_responsable
  before insert on public.inmobiliarias
  for each row execute function public.asignar_responsable();

-- 2) Reparto de los que están ahora sin responsable (uno a uno, siempre al que tenga menos)
do $$
declare
  r record;
  n_rafael integer;
  n_gonzalo integer;
begin
  for r in
    select id from public.inmobiliarias
    where responsable is null and etapa = 'sin_contactar' and coalesce(estado, '') <> 'descartada'
    order by id
  loop
    select count(*) into n_rafael from public.inmobiliarias where responsable = 'rafael' and etapa = 'sin_contactar';
    select count(*) into n_gonzalo from public.inmobiliarias where responsable = 'gonzalo' and etapa = 'sin_contactar';
    update public.inmobiliarias
      set responsable = case when n_gonzalo < n_rafael then 'gonzalo' else 'rafael' end
      where id = r.id;
  end loop;
end $$;
