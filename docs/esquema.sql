-- =========================================================
-- Esquema de la base de datos — Cine SAVA
-- Proyecto de Programación IV (UTN)
--
-- Este archivo documenta TODO el SQL ejecutado en Supabase,
-- en el orden en que se fue creando. Sirve para:
--   1. Entender la base sin abrir el dashboard.
--   2. Recrear el proyecto desde cero si hiciera falta.
--   3. Material de consulta para la defensa oral.
-- =========================================================


-- =========================================================
-- 1. CATÁLOGO: películas y géneros (muchos a muchos)
-- =========================================================

create table generos (
  id bigint generated always as identity primary key,
  nombre text not null unique
);

create table peliculas (
  id bigint generated always as identity primary key,
  nombre text not null,
  sinopsis text not null,
  duracion_min integer not null check (duracion_min > 0),
  imagen_url text,
  restriccion_edad integer not null default 0 check (restriccion_edad in (0, 13, 18)),
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- Tabla intermedia: una película puede tener varios géneros,
-- y un género pertenece a varias películas.
create table peliculas_generos (
  pelicula_id bigint not null references peliculas(id) on delete cascade,
  genero_id bigint not null references generos(id) on delete cascade,
  primary key (pelicula_id, genero_id)
);

alter table generos enable row level security;
alter table peliculas enable row level security;
alter table peliculas_generos enable row level security;

create policy "lectura publica" on generos for select using (true);
create policy "lectura publica" on peliculas for select using (true);
create policy "lectura publica" on peliculas_generos for select using (true);


-- =========================================================
-- 2. CANDY: productos y categorías (uno a muchos)
-- =========================================================

create table categorias_candy (
  id bigint generated always as identity primary key,
  nombre text not null unique
);

create table productos_candy (
  id bigint generated always as identity primary key,
  nombre text not null,
  descripcion text,
  precio numeric(10, 2) not null check (precio >= 0),
  categoria_id bigint not null references categorias_candy(id),
  imagen_url text,
  disponible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table categorias_candy enable row level security;
alter table productos_candy enable row level security;

create policy "lectura publica" on categorias_candy for select using (true);
create policy "lectura publica" on productos_candy for select using (true);


-- =========================================================
-- 3. USUARIOS: perfiles (extiende auth.users de Supabase)
-- =========================================================

create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  apellido text not null default '',
  fecha_nacimiento date,
  tipo_sangre text check (tipo_sangre in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  color_ojos text,
  dias_vacaciones integer check (dias_vacaciones between 0 and 365),
  rol text not null default 'cliente' check (rol in ('cliente','admin','empleado')),
  created_at timestamptz not null default now()
);

-- Se crea SOLO desde este trigger: el rol nunca lo define el usuario.
create function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles
    (id, nombre, apellido, fecha_nacimiento, tipo_sangre, color_ojos, dias_vacaciones)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    (new.raw_user_meta_data->>'fecha_nacimiento')::date,
    new.raw_user_meta_data->>'tipo_sangre',
    new.raw_user_meta_data->>'color_ojos',
    (new.raw_user_meta_data->>'dias_vacaciones')::integer
  );
  return new;
end;
$$;

create trigger al_crear_usuario
after insert on auth.users
for each row execute function public.crear_perfil();

alter table perfiles enable row level security;

-- Cada usuario lee solo su propia fila.
create policy "cada usuario lee su perfil"
on perfiles for select
using (auth.uid() = id);

-- Volver admin a un usuario (manual, por SQL):
-- update perfiles set rol = 'admin' where id = (select id from auth.users where email = '...');


-- =========================================================
-- 4. SALAS Y FUNCIONES: la lógica de negocio principal
-- =========================================================

create extension if not exists btree_gist;

create table salas (
  id bigint generated always as identity primary key,
  nombre text not null unique
);

insert into salas (nombre) values
  ('Sala 1'), ('Sala 2'), ('Sala 3'), ('Sala 4'), ('Sala 5'), ('Sala 6');

create table funciones (
  id bigint generated always as identity primary key,
  pelicula_id bigint not null references peliculas(id),
  sala_id bigint not null references salas(id),
  inicia_en timestamptz not null,
  termina_en timestamptz not null,
  -- inicia_en/termina_en estirados 30 min para cada lado. Se calcula UNA VEZ
  -- al insertar (en crear_funcion), porque Postgres no deja usar funciones
  -- "no immutable" (como restar un intervalo a una fecha) dentro de un índice.
  margen tstzrange not null,
  formato text not null check (formato in ('2D', '3D', '4D', '5D')),
  idioma text not null check (idioma in ('Castellano', 'Subtitulada')),
  precio_base numeric(10, 2) not null check (precio_base >= 0),
  activa boolean not null default true,
  created_at timestamptz not null default now(),

  -- Nunca puede haber dos funciones de la misma sala cuyo margen se toque.
  -- Es una "unique", pero para solapamiento de rangos en vez de igualdad.
  exclude using gist (
    sala_id with =,
    margen with &&
  )
);

alter table salas enable row level security;
alter table funciones enable row level security;
create policy "lectura publica" on salas for select using (true);
create policy "lectura publica" on funciones for select using (true);

-- Asigna la sala automáticamente: prueba cada sala en orden hasta
-- encontrar una libre para ese horario. Solo la puede ejecutar un admin.
create or replace function public.crear_funcion(
  p_pelicula_id bigint,
  p_inicia_en timestamptz,
  p_formato text,
  p_idioma text,
  p_precio_base numeric
) returns funciones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duracion integer;
  v_termina_en timestamptz;
  v_sala record;
  v_funcion funciones;
begin
  if not exists (select 1 from perfiles where id = auth.uid() and rol = 'admin') then
    raise exception 'No autorizado';
  end if;

  select duracion_min into v_duracion from peliculas where id = p_pelicula_id;
  if v_duracion is null then
    raise exception 'Película no encontrada';
  end if;

  v_termina_en := p_inicia_en + (v_duracion || ' minutes')::interval;

  for v_sala in select id from salas order by id loop
    begin
      insert into funciones (pelicula_id, sala_id, inicia_en, termina_en, margen, formato, idioma, precio_base)
      values (
        p_pelicula_id,
        v_sala.id,
        p_inicia_en,
        v_termina_en,
        tstzrange(p_inicia_en - interval '30 minutes', v_termina_en + interval '30 minutes'),
        p_formato,
        p_idioma,
        p_precio_base
      )
      returning * into v_funcion;

      return v_funcion;
    exception when exclusion_violation then
      -- esa sala está ocupada en ese horario; se prueba la siguiente
    end;
  end loop;

  raise exception 'No hay salas libres para ese horario';
end;
$$;


-- =========================================================
-- 5. BUTACAS EN TIEMPO REAL: butacas_estado
-- =========================================================
-- Las butacas en sí NO se guardan (el esquema está en Angular). Esta tabla guarda
-- solo las que tienen algo especial:
--   * 'bloqueada': alguien la está eligiendo (vence a los 5 minutos)
--   * 'vendida':   ya se compró (la pasa a vendida la función de compra)
-- Si una butaca no aparece acá para esa función, está LIBRE.

create table butacas_estado (
  funcion_id bigint not null references funciones(id) on delete cascade,
  fila text not null check (fila ~ '^[A-IJL-T]$'),
  numero integer not null check (numero between 1 and case when fila = 'J' then 14 else 28 end),
  estado text not null check (estado in ('bloqueada', 'vendida')),
  -- Hash (SHA-256) del id de sesión del navegador. La tabla es pública y se
  -- transmite por Realtime, así que el id real NUNCA se guarda: con el hash
  -- nadie puede liberar la butaca de otro.
  sesion_hash text not null,
  expira_en timestamptz,
  -- Una butaca bloqueada siempre tiene vencimiento.
  check (estado = 'vendida' or expira_en is not null),
  -- La clave primaria es la que impide que dos personas tomen la misma butaca.
  primary key (funcion_id, fila, numero)
);

alter table butacas_estado enable row level security;

-- Lectura pública (no hay datos personales). NO hay policy de escritura:
-- solo se modifica a través de las funciones de abajo.
create policy "lectura publica" on butacas_estado for select using (true);

-- Que Supabase transmita los cambios de esta tabla en tiempo real.
alter publication supabase_realtime add table butacas_estado;

-- Bloquea una butaca por 5 minutos. Si ya era tuya, renueva el tiempo.
-- Devuelve cuándo vence el bloqueo.
create or replace function public.bloquear_butaca(
  p_funcion_id bigint,
  p_fila text,
  p_numero integer,
  p_sesion uuid
) returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := encode(sha256(convert_to(p_sesion::text, 'UTF8')), 'hex');
  v_expira timestamptz := now() + interval '5 minutes';
begin
  if not exists (
    select 1 from funciones where id = p_funcion_id and activa and inicia_en > now()
  ) then
    raise exception 'La función no está disponible';
  end if;

  if (
    select count(*) from butacas_estado
    where funcion_id = p_funcion_id and sesion_hash = v_hash
      and estado = 'bloqueada' and expira_en > now()
  ) >= 8 then
    raise exception 'Máximo 8 butacas por compra';
  end if;

  -- Un bloqueo vencido cuenta como libre: se borra antes de intentar tomarla.
  delete from butacas_estado
  where funcion_id = p_funcion_id and fila = p_fila and numero = p_numero
    and estado = 'bloqueada' and expira_en <= now();

  -- Si otra persona la tiene (o está vendida), el "where" impide el update
  -- y no se afecta ninguna fila.
  insert into butacas_estado (funcion_id, fila, numero, estado, sesion_hash, expira_en)
  values (p_funcion_id, p_fila, p_numero, 'bloqueada', v_hash, v_expira)
  on conflict (funcion_id, fila, numero) do update
    set expira_en = excluded.expira_en
    where butacas_estado.estado = 'bloqueada' and butacas_estado.sesion_hash = v_hash;

  if not found then
    raise exception 'Butaca no disponible';
  end if;

  return v_expira;
end;
$$;

-- Libera una butaca, pero solo si la bloqueó esta misma sesión.
create or replace function public.liberar_butaca(
  p_funcion_id bigint,
  p_fila text,
  p_numero integer,
  p_sesion uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from butacas_estado
  where funcion_id = p_funcion_id and fila = p_fila and numero = p_numero
    and estado = 'bloqueada'
    and sesion_hash = encode(sha256(convert_to(p_sesion::text, 'UTF8')), 'hex');
end;
$$;

grant execute on function public.bloquear_butaca(bigint, text, integer, uuid) to anon, authenticated;
grant execute on function public.liberar_butaca(bigint, text, integer, uuid) to anon, authenticated;



