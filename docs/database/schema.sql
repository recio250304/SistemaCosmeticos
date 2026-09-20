-- ============================================================
-- SISTEMA DE COSMÉTICOS
-- ESQUEMA INICIAL DE BASE DE DATOS
-- PostgreSQL / Supabase
-- ============================================================

-- ============================================================
-- 1. EXTENSIONES
-- ============================================================

create extension if not exists "pgcrypto";


-- ============================================================
-- 2. ENUMS
-- ============================================================

create type public.rol_usuario as enum (
    'ADMIN',
    'OPERADOR'
);

create type public.tipo_cliente as enum (
    'BARBERIA',
    'SALON'
);

create type public.tipo_producto as enum (
    'INDIVIDUAL',
    'KIT'
);

create type public.tipo_kit as enum (
    'BARBERIA',
    'SALON'
);

create type public.estado_usuario as enum (
    'ACTIVO',
    'INACTIVO'
);

create type public.estado_venta as enum (
    'PENDIENTE',
    'PAGADA',
    'ANULADA'
);

create type public.tipo_movimiento_inventario as enum (
    'ENTRADA_ALMACEN',
    'SALIDA_OPERADOR',
    'VENTA',
    'DEVOLUCION_ALMACEN',
    'AJUSTE'
);

create type public.tipo_movimiento_caja as enum (
    'COBRO_VENTA',
    'AJUSTE'
);

create type public.tipo_comprobante as enum (
    'VENTA',
    'PAGO'
);

create type public.estado_ruta as enum (
    'ABIERTA',
    'CERRADA',
    'CANCELADA'
);


-- ============================================================
-- 3. USUARIOS
-- ============================================================

create table public.usuarios (
    id uuid primary key default gen_random_uuid(),

    nombre_completo text not null,
    usuario text not null unique,

    rol public.rol_usuario not null,

    estado public.estado_usuario not null default 'ACTIVO',

    auth_user_id uuid unique,

    telefono text,

    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now()
);


-- ============================================================
-- 4. CLIENTES
-- ============================================================

create table public.clientes (
    id uuid primary key default gen_random_uuid(),

    nombre_negocio text not null,

    tipo public.tipo_cliente not null,

    nombre_contacto text,

    telefono text,
    telefono_secundario text,

    direccion text,
    sector text,
    ciudad text,

    activo boolean not null default true,

    creado_por uuid references public.usuarios(id),

    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now()
);


-- ============================================================
-- 5. PRODUCTOS
-- ============================================================

create table public.productos (
    id uuid primary key default gen_random_uuid(),

    codigo text unique,

    nombre text not null,

    descripcion text,

    tipo public.tipo_producto not null default 'INDIVIDUAL',

    precio numeric(12,2) not null check (precio >= 0),

    costo numeric(12,2) check (costo >= 0),

    unidad text not null default 'UNIDAD',

    activo boolean not null default true,

    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now()
);


-- ============================================================
-- 6. KITS
-- ============================================================

create table public.kits (
    id uuid primary key default gen_random_uuid(),

    nombre text not null,

    tipo public.tipo_kit not null,

    descripcion text,

    precio numeric(12,2) not null check (precio >= 0),

    activo boolean not null default true,

    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now()
);


-- ============================================================
-- 7. PRODUCTOS DENTRO DE LOS KITS
-- ============================================================

create table public.kit_detalles (
    id uuid primary key default gen_random_uuid(),

    kit_id uuid not null
        references public.kits(id)
        on delete cascade,

    producto_id uuid not null
        references public.productos(id)
        on delete restrict,

    cantidad integer not null check (cantidad > 0),

    unique (kit_id, producto_id)
);


-- ============================================================
-- 8. INVENTARIO DEL ALMACÉN
-- ============================================================

create table public.inventario_almacen (
    producto_id uuid primary key
        references public.productos(id)
        on delete restrict,

    cantidad integer not null default 0
        check (cantidad >= 0),

    actualizado_en timestamptz not null default now()
);


-- ============================================================
-- 9. RUTAS DIARIAS
-- ============================================================

create table public.rutas (
    id uuid primary key default gen_random_uuid(),

    operador_id uuid not null
        references public.usuarios(id)
        on delete restrict,

    fecha date not null default current_date,

    estado public.estado_ruta not null default 'ABIERTA',

    hora_salida timestamptz,

    hora_cierre timestamptz,

    observaciones text,

    creado_en timestamptz not null default now(),

    unique (operador_id, fecha)
);


-- ============================================================
-- 10. INVENTARIO DE LA RUTA
-- ============================================================

create table public.ruta_inventario (
    id uuid primary key default gen_random_uuid(),

    ruta_id uuid not null
        references public.rutas(id)
        on delete cascade,

    producto_id uuid not null
        references public.productos(id)
        on delete restrict,

    cantidad_salida integer not null default 0
        check (cantidad_salida >= 0),

    cantidad_vendida integer not null default 0
        check (cantidad_vendida >= 0),

    cantidad_devuelta integer not null default 0
        check (cantidad_devuelta >= 0),

    cantidad_ajustada integer not null default 0,

    unique (ruta_id, producto_id)
);


-- ============================================================
-- 11. MOVIMIENTOS DE INVENTARIO
-- ============================================================

create table public.movimientos_inventario (
    id uuid primary key default gen_random_uuid(),

    producto_id uuid not null
        references public.productos(id)
        on delete restrict,

    ruta_id uuid
        references public.rutas(id)
        on delete restrict,

    usuario_id uuid
        references public.usuarios(id)
        on delete restrict,

    tipo public.tipo_movimiento_inventario not null,

    cantidad integer not null
        check (cantidad > 0),

    referencia_id uuid,

    descripcion text,

    creado_en timestamptz not null default now()
);


-- ============================================================
-- 12. VENTAS
-- ============================================================

create table public.ventas (
    id uuid primary key default gen_random_uuid(),

    numero_venta bigint generated always as identity unique,

    cliente_id uuid not null
        references public.clientes(id)
        on delete restrict,

    operador_id uuid not null
        references public.usuarios(id)
        on delete restrict,

    ruta_id uuid
        references public.rutas(id)
        on delete restrict,

    subtotal numeric(12,2) not null default 0
        check (subtotal >= 0),

    descuento numeric(12,2) not null default 0
        check (descuento >= 0),

    total numeric(12,2) not null
        check (total >= 0),

    total_pagado numeric(12,2) not null default 0
        check (total_pagado >= 0),

    saldo_pendiente numeric(12,2) not null default 0
        check (saldo_pendiente >= 0),

    estado public.estado_venta not null default 'PENDIENTE',

    fecha_venta timestamptz not null default now(),

    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now()
);


-- ============================================================
-- 13. DETALLES DE VENTA
-- ============================================================

create table public.venta_detalles (
    id uuid primary key default gen_random_uuid(),

    venta_id uuid not null
        references public.ventas(id)
        on delete cascade,

    producto_id uuid
        references public.productos(id)
        on delete restrict,

    kit_id uuid
        references public.kits(id)
        on delete restrict,

    descripcion text not null,

    cantidad integer not null
        check (cantidad > 0),

    precio_unitario numeric(12,2) not null
        check (precio_unitario >= 0),

    subtotal numeric(12,2) not null
        check (subtotal >= 0),

    check (
        (producto_id is not null and kit_id is null)
        or
        (producto_id is null and kit_id is not null)
    )
);


-- ============================================================
-- 14. PAGOS
-- ============================================================

create table public.pagos (
    id uuid primary key default gen_random_uuid(),

    venta_id uuid not null
        references public.ventas(id)
        on delete restrict,

    cliente_id uuid not null
        references public.clientes(id)
        on delete restrict,

    operador_id uuid not null
        references public.usuarios(id)
        on delete restrict,

    ruta_id uuid
        references public.rutas(id)
        on delete restrict,

    monto numeric(12,2) not null
        check (monto > 0),

    fecha_pago timestamptz not null default now(),

    observaciones text,

    creado_en timestamptz not null default now()
);


-- ============================================================
-- 15. MOVIMIENTOS DE CAJA
-- ============================================================

create table public.movimientos_caja (
    id uuid primary key default gen_random_uuid(),

    operador_id uuid
        references public.usuarios(id)
        on delete restrict,

    ruta_id uuid
        references public.rutas(id)
        on delete restrict,

    pago_id uuid
        references public.pagos(id)
        on delete restrict,

    tipo public.tipo_movimiento_caja not null,

    monto numeric(12,2) not null
        check (monto > 0),

    descripcion text,

    creado_en timestamptz not null default now()
);


-- ============================================================
-- 16. COMPROBANTES
-- ============================================================

create table public.comprobantes (
    id uuid primary key default gen_random_uuid(),

    numero bigint generated always as identity unique,

    tipo public.tipo_comprobante not null,

    venta_id uuid
        references public.ventas(id)
        on delete restrict,

    pago_id uuid
        references public.pagos(id)
        on delete restrict,

    cliente_id uuid not null
        references public.clientes(id)
        on delete restrict,

    operador_id uuid not null
        references public.usuarios(id)
        on delete restrict,

    monto numeric(12,2) not null
        check (monto >= 0),

    fecha_emision timestamptz not null default now()
);


-- ============================================================
-- 17. AUDITORÍA
-- ============================================================

create table public.auditoria (
    id uuid primary key default gen_random_uuid(),

    usuario_id uuid
        references public.usuarios(id)
        on delete restrict,

    accion text not null,

    tabla_afectada text,

    registro_id uuid,

    datos_anteriores jsonb,

    datos_nuevos jsonb,

    ip text,

    creado_en timestamptz not null default now()
);


-- ============================================================
-- 18. ÍNDICES
-- ============================================================

create index idx_clientes_tipo
    on public.clientes(tipo);

create index idx_clientes_activo
    on public.clientes(activo);

create index idx_productos_activo
    on public.productos(activo);

create index idx_kits_tipo
    on public.kits(tipo);

create index idx_rutas_operador
    on public.rutas(operador_id);

create index idx_rutas_fecha
    on public.rutas(fecha);

create index idx_ruta_inventario_ruta
    on public.ruta_inventario(ruta_id);

create index idx_movimientos_inventario_producto
    on public.movimientos_inventario(producto_id);

create index idx_movimientos_inventario_ruta
    on public.movimientos_inventario(ruta_id);

create index idx_ventas_cliente
    on public.ventas(cliente_id);

create index idx_ventas_operador
    on public.ventas(operador_id);

create index idx_ventas_ruta
    on public.ventas(ruta_id);

create index idx_ventas_fecha
    on public.ventas(fecha_venta);

create index idx_venta_detalles_venta
    on public.venta_detalles(venta_id);

create index idx_pagos_venta
    on public.pagos(venta_id);

create index idx_pagos_cliente
    on public.pagos(cliente_id);

create index idx_pagos_operador
    on public.pagos(operador_id);

create index idx_pagos_fecha
    on public.pagos(fecha_pago);

create index idx_movimientos_caja_ruta
    on public.movimientos_caja(ruta_id);

create index idx_comprobantes_venta
    on public.comprobantes(venta_id);

create index idx_comprobantes_pago
    on public.comprobantes(pago_id);

create index idx_auditoria_usuario
    on public.auditoria(usuario_id);

create index idx_auditoria_fecha
    on public.auditoria(creado_en);


-- ============================================================
-- 19. FUNCIÓN PARA ACTUALIZAR updated_at
-- ============================================================

create or replace function public.actualizar_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.actualizado_en = now();
    return new;
end;
$$;


-- ============================================================
-- 20. TRIGGERS updated_at
-- ============================================================

create trigger trg_usuarios_updated_at
before update on public.usuarios
for each row
execute function public.actualizar_updated_at();

create trigger trg_clientes_updated_at
before update on public.clientes
for each row
execute function public.actualizar_updated_at();

create trigger trg_productos_updated_at
before update on public.productos
for each row
execute function public.actualizar_updated_at();

create trigger trg_kits_updated_at
before update on public.kits
for each row
execute function public.actualizar_updated_at();

create trigger trg_ventas_updated_at
before update on public.ventas
for each row
execute function public.actualizar_updated_at();


-- ============================================================
-- 21. ROW LEVEL SECURITY
-- ============================================================
--
-- Activamos RLS desde el principio.
--
-- IMPORTANTE:
-- En esta etapa NO creamos políticas públicas.
-- Esto significa que las tablas quedan protegidas frente
-- a accesos directos mediante las claves públicas.
--
-- Las políticas específicas se crearán después de implementar
-- autenticación y determinar correctamente los permisos de
-- ADMIN y OPERADOR.
--
-- El backend utilizará posteriormente un mecanismo seguro
-- para realizar las operaciones autorizadas.
-- ============================================================

alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public.productos enable row level security;
alter table public.kits enable row level security;
alter table public.kit_detalles enable row level security;
alter table public.inventario_almacen enable row level security;
alter table public.rutas enable row level security;
alter table public.ruta_inventario enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.ventas enable row level security;
alter table public.venta_detalles enable row level security;
alter table public.pagos enable row level security;
alter table public.movimientos_caja enable row level security;
alter table public.comprobantes enable row level security;
alter table public.auditoria enable row level security;


-- ============================================================
-- FIN DEL ESQUEMA INICIAL
-- ============================================================