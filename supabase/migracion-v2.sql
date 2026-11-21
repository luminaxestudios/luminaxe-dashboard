-- Migración CRM Luminaxe v2 (ya aplicada el 2026-11-21)
-- No borra ni modifica las columnas existentes (estado, subestado, notas...). Solo AÑADE.
-- Se puede ejecutar más de una vez sin problema.

alter table public.inmobiliarias
  add column if not exists responsable text,
  add column if not exists etapa text not null default 'sin_contactar',
  add column if not exists motivo_descarte text,
  add column if not exists decisor text,
  add column if not exists ultimo_contacto timestamptz,
  add column if not exists intentos integer not null default 0,
  add column if not exists proxima_accion text,
  add column if not exists proxima_fecha date,
  add column if not exists email_enviado_at timestamptz;

create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  inmobiliaria_id text not null,
  persona text,
  tipo text not null,
  de text,
  a text,
  creado timestamptz not null default now()
);
create index if not exists eventos_creado_idx on public.eventos (creado desc);

alter table public.eventos enable row level security;
drop policy if exists eventos_select on public.eventos;
drop policy if exists eventos_insert on public.eventos;
create policy eventos_select on public.eventos for select using (true);
create policy eventos_insert on public.eventos for insert with check (true);

do $$
begin
  alter publication supabase_realtime add table public.eventos;
exception when duplicate_object then null;
end $$;

update public.inmobiliarias set
  responsable = case when estado in ('rafael', 'gonzalo') then estado end,
  etapa = case
    when estado = 'descartada' then 'descartada'
    when no_contesta then 'no_coge'
    when subestado = 'agendados' then 'cualificada'
    when subestado = 'manda_info' then 'hablo'
    else 'sin_contactar'
  end,
  proxima_accion = case
    when subestado = 'manda_info' then 'Mandar info por email'
    when subestado = 'agendados' then 'Revisar llamada agendada'
    when subestado = 'para_llamar' then 'Llamar'
  end,
  proxima_fecha = case when subestado in ('manda_info', 'agendados') then current_date end
where etapa = 'sin_contactar' and responsable is null and intentos = 0;

update public.inmobiliarias set etapa = 'cliente'
where nombre ilike 'Fincas Ugalde%' or nombre ilike 'Borja Barrera%';
