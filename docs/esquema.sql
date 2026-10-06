-- =========================================================
-- Esquema de la base de datos — Cine SAVA
-- Proyecto de Programación IV (UTN)
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
  -- Desde que empieza hasta 30 min después de que termina (recambio de sala).
  -- El rango es cerrado a la izquierda y abierto a la derecha, así que la
  -- siguiente función puede empezar justo cuando se cumplen los 30 min.
  -- Se calcula UNA VEZ al insertar (en crear_funcion), porque Postgres no deja usar
  -- funciones "no immutable" (como sumar un intervalo a una fecha) dentro de un índice.
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
        tstzrange(p_inicia_en, v_termina_en + interval '30 minutes'),
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
--   * 'bloqueada': alguien la está eligiendo (vence a los 10 minutos)
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

-- Bloquea una butaca por 10 minutos (alcanza para pasar por el candy y el checkout).
-- Si ya era tuya, renueva el tiempo.
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
  v_expira timestamptz := now() + interval '10 minutes';
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


-- =========================================================
-- 6. COMPRAS: compras, entradas e items de candy
-- =========================================================
-- Una compra tiene muchas entradas y muchos items de candy (uno a muchos):
-- la clave foránea va en el lado "muchos".

create table compras (
  id bigint generated always as identity primary key,
  -- null = compra anónima (se puede comprar sin registrarse)
  usuario_id uuid references auth.users(id),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Es lo que va en el QR y lo que tipea el empleado. Aleatorio, no adivinable.
  codigo text not null unique,
  total numeric(10, 2) not null check (total >= 0),
  -- Se marca cuando el candy bar entrega la comida (el QR deja de servir para eso).
  candy_retirado boolean not null default false,
  creada_en timestamptz not null default now()
);

create table entradas (
  id bigint generated always as identity primary key,
  compra_id bigint not null references compras(id) on delete cascade,
  funcion_id bigint not null references funciones(id),
  fila text not null,
  numero integer not null,
  tipo text not null check (tipo in ('normal', 'accesible', 'vip')),
  -- Precio de ESTA entrada al momento de comprar (no cambia si el admin cambia el precio).
  precio numeric(10, 2) not null check (precio >= 0),
  -- Se marca cuando el empleado la valida en la puerta (el QR deja de servir para entrar).
  usada boolean not null default false,
  -- Segunda barrera (la primera es butacas_estado): una butaca, una entrada.
  unique (funcion_id, fila, numero)
);

create table items_candy (
  id bigint generated always as identity primary key,
  compra_id bigint not null references compras(id) on delete cascade,
  producto_id bigint not null references productos_candy(id),
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(10, 2) not null check (precio_unitario >= 0)
);

alter table compras enable row level security;
alter table entradas enable row level security;
alter table items_candy enable row level security;

-- Privadas: cada usuario logueado ve solo lo suyo. Nadie escribe directo,
-- solo la función comprar(). Los anónimos recuperan su compra con obtener_entrada().
create policy "ver mis compras" on compras for select
using (usuario_id = auth.uid());

create policy "ver mis entradas" on entradas for select
using (exists (select 1 from compras c where c.id = compra_id and c.usuario_id = auth.uid()));

create policy "ver mis items" on items_candy for select
using (exists (select 1 from compras c where c.id = compra_id and c.usuario_id = auth.uid()));


-- Hace TODA la compra en una transacción: si algo falla, no queda nada a medias.
--   p_butacas: [{"fila": "C", "numero": 5}, ...]   (puede ser vacío si solo compra candy)
--   p_items:   [{"producto_id": 3, "cantidad": 2}, ...]   (puede ser vacío)
-- Los precios se calculan ACÁ: del navegador solo llegan ids y cantidades.
-- Devuelve el código de la compra.
create or replace function public.comprar(
  p_funcion_id bigint,
  p_butacas jsonb,
  p_items jsonb,
  p_email text,
  p_sesion uuid
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := encode(sha256(convert_to(p_sesion::text, 'UTF8')), 'hex');
  v_funcion funciones;
  v_pelicula peliculas;
  v_nacimiento date;
  v_compra_id bigint;
  v_codigo text;
  v_total numeric := 0;
  v_butaca record;
  v_item record;
  v_tipo text;
  v_precio numeric;
begin
  if jsonb_array_length(p_butacas) = 0 and jsonb_array_length(p_items) = 0 then
    raise exception 'La compra está vacía';
  end if;

  -- Validaciones de las entradas antes de crear nada.
  if jsonb_array_length(p_butacas) > 0 then
    select * into v_funcion from funciones
    where id = p_funcion_id and activa and inicia_en > now();
    if not found then
      raise exception 'La función no está disponible';
    end if;

    select * into v_pelicula from peliculas where id = v_funcion.pelicula_id;

    -- Restricción de edad: solo se puede comprobar si el usuario está registrado.
    -- A los anónimos se les avisa en pantalla que un menor debe ir con un adulto.
    if v_pelicula.restriccion_edad > 0 and auth.uid() is not null then
      select fecha_nacimiento into v_nacimiento from perfiles where id = auth.uid();
      if v_nacimiento is not null
         and extract(year from age(v_nacimiento)) < v_pelicula.restriccion_edad then
        raise exception 'No tenés la edad mínima para esta película';
      end if;
    end if;
  end if;

  -- Código único y no adivinable.
  loop
    v_codigo := 'CN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from compras where codigo = v_codigo);
  end loop;

  insert into compras (usuario_id, email, codigo, total)
  values (auth.uid(), p_email, v_codigo, 0)
  returning id into v_compra_id;

  -- Entradas: cada butaca tiene que estar bloqueada por ESTA sesión y sin vencer.
  if jsonb_array_length(p_butacas) > 0 then
    for v_butaca in
      select b->>'fila' as fila, (b->>'numero')::integer as numero
      from jsonb_array_elements(p_butacas) b
    loop
      perform 1 from butacas_estado
      where funcion_id = p_funcion_id and fila = v_butaca.fila and numero = v_butaca.numero
        and estado = 'bloqueada' and sesion_hash = v_hash and expira_en > now()
      for update;

      if not found then
        raise exception 'La butaca % no está reservada por vos (¿venció el tiempo?)',
          v_butaca.fila || v_butaca.numero;
      end if;

      -- Mismas reglas que el mapa de Angular: R, S, T son VIP; J es la accesible.
      v_tipo := case
        when v_butaca.fila in ('R', 'S', 'T') then 'vip'
        when v_butaca.fila = 'J' then 'accesible'
        else 'normal'
      end;
      v_precio := case when v_tipo = 'vip' then v_funcion.precio_base * 1.5 else v_funcion.precio_base end;

      insert into entradas (compra_id, funcion_id, fila, numero, tipo, precio)
      values (v_compra_id, p_funcion_id, v_butaca.fila, v_butaca.numero, v_tipo, v_precio);

      -- Deja de ser un bloqueo temporal: pasa a vendida para siempre.
      update butacas_estado set estado = 'vendida', expira_en = null
      where funcion_id = p_funcion_id and fila = v_butaca.fila and numero = v_butaca.numero;

      v_total := v_total + v_precio;
    end loop;
  end if;

  -- Candy: el precio sale de la tabla, nunca del navegador.
  for v_item in
    select (i->>'producto_id')::bigint as producto_id, (i->>'cantidad')::integer as cantidad
    from jsonb_array_elements(p_items) i
  loop
    if v_item.cantidad < 1 or v_item.cantidad > 20 then
      raise exception 'Cantidad inválida';
    end if;

    select precio into v_precio from productos_candy
    where id = v_item.producto_id and disponible;
    if v_precio is null then
      raise exception 'Un producto ya no está disponible';
    end if;

    insert into items_candy (compra_id, producto_id, cantidad, precio_unitario)
    values (v_compra_id, v_item.producto_id, v_item.cantidad, v_precio);

    v_total := v_total + v_precio * v_item.cantidad;
  end loop;

  update compras set total = v_total where id = v_compra_id;
  return v_codigo;
end;
$$;


-- Devuelve todo lo necesario para mostrar la entrada (con QR) a partir del código.
-- El código funciona como una llave: sirve tanto para anónimos como para el empleado.
create or replace function public.obtener_entrada(p_codigo text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'codigo', c.codigo,
    'total', c.total,
    'creada_en', c.creada_en,
    'candy_retirado', c.candy_retirado,
    'entradas', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'fila', e.fila,
          'numero', e.numero,
          'tipo', e.tipo,
          'precio', e.precio,
          'usada', e.usada,
          'pelicula', p.nombre,
          'restriccion_edad', p.restriccion_edad,
          'inicia_en', f.inicia_en,
          'formato', f.formato,
          'idioma', f.idioma,
          'sala', s.nombre
        ) order by e.fila, e.numero
      )
      from entradas e
      join funciones f on f.id = e.funcion_id
      join salas s on s.id = f.sala_id
      join peliculas p on p.id = f.pelicula_id
      where e.compra_id = c.id
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'nombre', pc.nombre,
          'cantidad', i.cantidad,
          'precio_unitario', i.precio_unitario
        )
      )
      from items_candy i
      join productos_candy pc on pc.id = i.producto_id
      where i.compra_id = c.id
    ), '[]'::jsonb)
  )
  from compras c
  where c.codigo = upper(trim(p_codigo));
$$;

grant execute on function public.comprar(bigint, jsonb, jsonb, text, uuid) to anon, authenticated;
grant execute on function public.obtener_entrada(text) to anon, authenticated;


-- =========================================================
-- 7. VALIDACIÓN DEL EMPLEADO: marcar entradas y candy como usados
-- =========================================================
-- El QR es solo el código: lo que lo hace "de un solo uso" es esta marca en la base.
-- Solo pueden usarlas empleados y admins. El "update ... where not usada" es atómico:
-- si dos empleados validan a la vez, solo uno logra marcarla y el otro recibe el error.

create or replace function public.validar_entrada(p_codigo text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra_id bigint;
  v_cantidad integer;
begin
  if not exists (
    select 1 from perfiles where id = auth.uid() and rol in ('empleado', 'admin')
  ) then
    raise exception 'No autorizado';
  end if;

  select id into v_compra_id from compras where codigo = upper(trim(p_codigo));
  if v_compra_id is null then
    raise exception 'No existe una compra con ese código';
  end if;

  if not exists (select 1 from entradas where compra_id = v_compra_id) then
    raise exception 'Esta compra no tiene entradas';
  end if;

  update entradas set usada = true where compra_id = v_compra_id and not usada;
  get diagnostics v_cantidad = row_count;

  if v_cantidad = 0 then
    raise exception 'Las entradas de esta compra ya fueron utilizadas';
  end if;

  return v_cantidad;
end;
$$;

create or replace function public.entregar_candy(p_codigo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra_id bigint;
  v_cantidad integer;
begin
  if not exists (
    select 1 from perfiles where id = auth.uid() and rol in ('empleado', 'admin')
  ) then
    raise exception 'No autorizado';
  end if;

  select id into v_compra_id from compras where codigo = upper(trim(p_codigo));
  if v_compra_id is null then
    raise exception 'No existe una compra con ese código';
  end if;

  if not exists (select 1 from items_candy where compra_id = v_compra_id) then
    raise exception 'Esta compra no incluye candy';
  end if;

  update compras set candy_retirado = true where id = v_compra_id and not candy_retirado;
  get diagnostics v_cantidad = row_count;

  if v_cantidad = 0 then
    raise exception 'El candy de esta compra ya fue retirado';
  end if;
end;
$$;

grant execute on function public.validar_entrada(text) to authenticated;
grant execute on function public.entregar_candy(text) to authenticated;


-- =========================================================
-- 8. PANEL DE ADMIN: roles, precios del candy y edición de funciones
-- =========================================================
-- Todas las operaciones del panel son funciones SQL que comprueban que quien llama
-- sea admin. Así la seguridad no depende de que el panel esté escondido en Angular.

create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'admin');
$$;

-- Lista solo el personal (empleados y admins), no todos los usuarios: es lo único que el
-- panel necesita mostrar. El email vive en auth.users, que el cliente no puede leer.
create or replace function public.listar_personal()
returns table (id uuid, email text, nombre text, apellido text, rol text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not es_admin() then
    raise exception 'No autorizado';
  end if;

  return query
  select u.id, u.email::text, p.nombre, p.apellido, p.rol
  from auth.users u
  join perfiles p on p.id = u.id
  where p.rol in ('empleado', 'admin')
  order by p.rol, u.email;
end;
$$;

-- Da el rol 'cliente', 'empleado' o 'admin' al usuario con ese email.
create or replace function public.cambiar_rol(p_email text, p_rol text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not es_admin() then
    raise exception 'No autorizado';
  end if;

  if p_rol not in ('cliente', 'empleado', 'admin') then
    raise exception 'Rol inválido';
  end if;

  select u.id into v_id from auth.users u where lower(u.email) = lower(trim(p_email));
  if v_id is null then
    raise exception 'No existe un usuario con ese email';
  end if;

  -- Evita que el único admin se saque el permiso por error y se quede sin acceso.
  if v_id = auth.uid() then
    raise exception 'No podés cambiar tu propio rol';
  end if;

  update perfiles set rol = p_rol where id = v_id;
end;
$$;

create or replace function public.actualizar_producto_candy(
  p_id bigint,
  p_precio numeric,
  p_disponible boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not es_admin() then
    raise exception 'No autorizado';
  end if;

  if p_precio is null or p_precio < 0 then
    raise exception 'Precio inválido';
  end if;

  update productos_candy set precio = p_precio, disponible = p_disponible where id = p_id;
  if not found then
    raise exception 'Producto no encontrado';
  end if;
end;
$$;

-- Edita una función ya creada. Si ya se vendieron entradas, solo se puede cambiar el
-- precio (el de las entradas vendidas no cambia: cada una guarda su propio precio).
create or replace function public.actualizar_funcion(
  p_id bigint,
  p_formato text,
  p_idioma text,
  p_precio numeric,
  p_activa boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_funcion funciones;
begin
  if not es_admin() then
    raise exception 'No autorizado';
  end if;

  select * into v_funcion from funciones where id = p_id;
  if not found then
    raise exception 'Función no encontrada';
  end if;

  if exists (select 1 from entradas where funcion_id = p_id)
     and (p_formato <> v_funcion.formato or p_idioma <> v_funcion.idioma or not p_activa) then
    raise exception 'Ya hay entradas vendidas: solo se puede cambiar el precio';
  end if;

  update funciones
  set formato = p_formato, idioma = p_idioma, precio_base = p_precio, activa = p_activa
  where id = p_id;
end;
$$;

grant execute on function public.es_admin() to authenticated;
grant execute on function public.listar_personal() to authenticated;
grant execute on function public.cambiar_rol(text, text) to authenticated;
grant execute on function public.actualizar_producto_candy(bigint, numeric, boolean) to authenticated;
grant execute on function public.actualizar_funcion(bigint, text, text, numeric, boolean) to authenticated;


-- =========================================================
-- 9. MÁS VENDIDAS, ADMIN DE PELÍCULAS Y REPORTES
-- =========================================================

-- Películas más vendidas (público: solo devuelve conteos, ningún dato personal).
-- Las películas sin ventas también entran, ordenadas por id, para que el home nunca quede vacío.
create or replace function public.peliculas_mas_vendidas(p_limite integer default 3)
returns table (pelicula_id bigint, entradas_vendidas bigint)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, count(e.id)
  from peliculas p
  left join funciones f on f.pelicula_id = p.id
  left join entradas e on e.funcion_id = f.id
  where p.activa
  group by p.id
  order by count(e.id) desc, p.id
  limit p_limite;
$$;

-- Crea (p_id null) o edita una película, junto con sus géneros. Devuelve su id.
create or replace function public.guardar_pelicula(
  p_id bigint,
  p_nombre text,
  p_sinopsis text,
  p_duracion integer,
  p_imagen_url text,
  p_edad integer,
  p_activa boolean,
  p_generos bigint[]
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if not es_admin() then
    raise exception 'No autorizado';
  end if;

  if trim(coalesce(p_nombre, '')) = '' then
    raise exception 'El nombre es obligatorio';
  end if;
  if trim(coalesce(p_sinopsis, '')) = '' then
    raise exception 'La sinopsis es obligatoria';
  end if;
  if p_duracion is null or p_duracion <= 0 then
    raise exception 'La duración debe ser mayor a 0';
  end if;
  if p_edad not in (0, 13, 18) then
    raise exception 'La restricción de edad debe ser 0, 13 o 18';
  end if;

  if p_id is null then
    insert into peliculas (nombre, sinopsis, duracion_min, imagen_url, restriccion_edad, activa)
    values (
      trim(p_nombre), trim(p_sinopsis), p_duracion,
      nullif(trim(coalesce(p_imagen_url, '')), ''), p_edad, p_activa
    )
    returning id into v_id;
  else
    update peliculas
    set nombre = trim(p_nombre),
        sinopsis = trim(p_sinopsis),
        duracion_min = p_duracion,
        imagen_url = nullif(trim(coalesce(p_imagen_url, '')), ''),
        restriccion_edad = p_edad,
        activa = p_activa
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Película no encontrada';
    end if;
  end if;

  -- Los géneros se reemplazan por los elegidos.
  delete from peliculas_generos where pelicula_id = v_id;
  insert into peliculas_generos (pelicula_id, genero_id)
  select v_id, g from unnest(coalesce(p_generos, '{}'::bigint[])) g;

  return v_id;
end;
$$;

-- REPORTES (solo admin). p_dias = cuántos días hacia atrás mirar (7, 30...).

-- Facturación por día, con todos los días del período (los sin ventas figuran en 0).
create or replace function public.reporte_facturacion(p_dias integer)
returns table (dia date, cantidad_compras bigint, facturado numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if not es_admin() then
    raise exception 'No autorizado';
  end if;

  return query
  select d::date, count(c.id), coalesce(sum(c.total), 0)
  from generate_series((v_hoy - (p_dias - 1))::timestamp, v_hoy::timestamp, interval '1 day') d
  left join compras c
    on (c.creada_en at time zone 'America/Argentina/Buenos_Aires')::date = d::date
  group by d
  order by d;
end;
$$;

-- Películas con más entradas vendidas en el período.
create or replace function public.reporte_peliculas(p_dias integer)
returns table (nombre_pelicula text, entradas_vendidas bigint, facturado numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not es_admin() then
    raise exception 'No autorizado';
  end if;

  return query
  select p.nombre, count(e.id), coalesce(sum(e.precio), 0)
  from entradas e
  join compras c on c.id = e.compra_id
  join funciones f on f.id = e.funcion_id
  join peliculas p on p.id = f.pelicula_id
  where c.creada_en >= now() - make_interval(days => p_dias)
  group by p.id, p.nombre
  order by count(e.id) desc, p.nombre
  limit 10;
end;
$$;

-- Productos del candy más vendidos en el período.
create or replace function public.reporte_productos(p_dias integer)
returns table (nombre_producto text, unidades bigint, facturado numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not es_admin() then
    raise exception 'No autorizado';
  end if;

  return query
  select pc.nombre, sum(i.cantidad)::bigint, coalesce(sum(i.cantidad * i.precio_unitario), 0)
  from items_candy i
  join compras c on c.id = i.compra_id
  join productos_candy pc on pc.id = i.producto_id
  where c.creada_en >= now() - make_interval(days => p_dias)
  group by pc.id, pc.nombre
  order by sum(i.cantidad) desc, pc.nombre
  limit 10;
end;
$$;

grant execute on function public.peliculas_mas_vendidas(integer) to anon, authenticated;
grant execute on function public.guardar_pelicula(bigint, text, text, integer, text, integer, boolean, bigint[]) to authenticated;
grant execute on function public.reporte_facturacion(integer) to authenticated;
grant execute on function public.reporte_peliculas(integer) to authenticated;
grant execute on function public.reporte_productos(integer) to authenticated;



