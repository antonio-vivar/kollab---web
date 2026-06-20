-- =====================================================================
--  KOLLAB — Plataforma Integrada de Gestión del Trabajo
--  Esquema de base de datos para Supabase (PostgreSQL)
--  GPY1101 — Evaluación de Proyectos de Software
--
--  IMPORTANTE — ESTADO ACTUAL DEL PROYECTO:
--  Este esquema es el DISEÑO de la base de datos para cuando Kollab
--  despliegue la plataforma definitiva (Opción A del informe EP3:
--  adquirir e integrar un SaaS). El MVP que corre hoy en frontend/
--  NO está conectado a esta base de datos: usa autenticación y
--  almacenamiento locales en el navegador (ver frontend/src/lib/auth.ts
--  y frontend/src/lib/storage.ts), para poder validar la experiencia
--  de cada rol sin depender de infraestructura en la nube todavía.
--  Este archivo queda como evidencia de cómo se implementaría la
--  seguridad (RLS/RBAC) en la siguiente fase del proyecto.
--
--  CÓMO USARLO (cuando se conecte a producción):
--   1. En tu proyecto de Supabase, ve a "SQL Editor".
--   2. Pega TODO este archivo y presiona "Run".
--   3. Crea los usuarios demo en Authentication > Users (ver README).
-- =====================================================================

-- ---------- LIMPIEZA (para re-ejecutar el script sin errores) ----------
-- Borra las tablas si ya existen, en orden inverso a sus dependencias
-- (cascade también borra las filas relacionadas en tablas hijas), para
-- que el script se pueda correr varias veces sin chocar con tablas
-- que quedaron de una ejecución anterior.
drop table if exists audit_log cascade;
drop table if exists comments cascade;
drop table if exists tasks cascade;
drop table if exists projects cascade;
drop table if exists integrations cascade;
drop table if exists profiles cascade;

-- =====================================================================
--  TABLAS
-- =====================================================================

-- Perfiles de usuario: extiende la tabla auth.users que Supabase crea
-- automáticamente para cada cuenta. Aquí se guarda lo que Supabase Auth
-- no maneja por sí solo: el nombre visible y, sobre todo, el ROL, que
-- es la base de todo el control de acceso (RBAC) del sistema.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null default 'colaborador'
              check (role in ('admin','gerente','colaborador')), -- solo se aceptan estos 3 valores
  created_at  timestamptz not null default now()
);

-- RF-01: Proyectos. "status" solo admite 3 valores controlados (no
-- texto libre), para que la interfaz pueda confiar en esos 3 estados
-- exactos al pintar los badges de color.
create table projects (
  id          bigint generated always as identity primary key,
  name        text not null,
  description text,
  status      text not null default 'curso'
              check (status in ('curso','riesgo','completado')),
  deadline    date,
  created_at  timestamptz not null default now()
);

-- RF-01: Tareas. Cada tarea pertenece a un proyecto ("project_id") y,
-- opcionalmente, a un responsable ("assignee_id"); si se elimina el
-- proyecto, sus tareas se eliminan en cascada; si se elimina el
-- responsable, la tarea queda sin asignar en vez de desaparecer.
create table tasks (
  id          bigint generated always as identity primary key,
  project_id  bigint not null references projects(id) on delete cascade,
  title       text not null,
  assignee_id uuid references profiles(id) on delete set null,
  priority    text not null default 'media'
              check (priority in ('alta','media','baja')),
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- RF-04: Comunicación estructurada y trazable. Cada comentario queda
-- asociado tanto al proyecto como a quién lo escribió, para poder
-- mostrar el hilo de conversación ordenado por fecha.
create table comments (
  id          bigint generated always as identity primary key,
  project_id  bigint not null references projects(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- RF-04 / RNF-03: Bitácora de auditoría. Guarda quién hizo qué acción y
-- cuándo, independiente de si la tarea/proyecto relacionado todavía
-- existe (por eso "on delete set null" en vez de cascade: el registro
-- histórico se conserva aunque se borre el usuario).
create table audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid references profiles(id) on delete set null,
  action      text not null,
  detail      text,
  created_at  timestamptz not null default now()
);

-- RF-05: Integraciones con herramientas externas (Slack, Drive, Zoom,
-- Jira, Trello). Solo guarda el ESTADO de la integración, no las
-- credenciales ni la sincronización real con cada API.
create table integrations (
  id          bigint generated always as identity primary key,
  tool        text not null,
  status      text not null default 'desconectado'
              check (status in ('conectado','desconectado')),
  last_sync   timestamptz
);

-- =====================================================================
--  FUNCIÓN AUXILIAR: rol del usuario actual (para políticas RBAC)
-- =====================================================================
-- Esta función centraliza la pregunta "¿qué rol tiene quien está
-- haciendo esta consulta?". Se usa dentro de las políticas RLS de más
-- abajo, en vez de repetir el mismo subquery en cada una.
-- "security definer" permite que la función lea la tabla profiles aunque
-- la política que la llama todavía no haya confirmado el acceso del
-- usuario a esa tabla; "stable" indica que, dentro de una misma consulta,
-- el resultado no cambia, lo que permite optimizar su ejecución.
create or replace function current_role_kollab()
returns text language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

-- Trigger: cada vez que se crea un usuario nuevo en Supabase Auth,
-- se crea automáticamente su fila correspondiente en "profiles", con
-- el nombre tomado de los metadatos del registro (o, si no viene, la
-- parte del correo antes del "@") y el rol "colaborador" por defecto
-- (los roles admin/gerente se asignan manualmente después).
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'colaborador')
  )
  on conflict (id) do nothing; -- evita duplicar el perfil si el trigger se dispara dos veces
  return new;
end;
$$;

-- Vuelve a crear el trigger (drop + create) para que el script se
-- pueda ejecutar varias veces sin error de "el trigger ya existe".
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
--  ROW LEVEL SECURITY (RBAC) — RNF-03 seguridad
--  RLS es el mecanismo de PostgreSQL que aplica reglas de acceso a
--  nivel de FILA, directamente en la base de datos. Esto es lo que
--  hace que el control de roles sea real y no solo "cosmético" en la
--  interfaz: aunque alguien llame a la API directamente sin pasar por
--  el frontend, la base de datos igual rechaza lo que no le corresponda
--  según su rol.
-- =====================================================================
alter table profiles     enable row level security;
alter table projects     enable row level security;
alter table tasks        enable row level security;
alter table comments     enable row level security;
alter table audit_log    enable row level security;
alter table integrations enable row level security;

-- PROFILES: cualquier usuario autenticado puede ver la lista de
-- perfiles (necesario para mostrar nombres en selectores de
-- "responsable"), pero solo puede modificar su propio perfil.
create policy "perfiles visibles a autenticados" on profiles
  for select to authenticated using (true);
create policy "actualiza tu propio perfil" on profiles
  for update to authenticated using (id = auth.uid());

-- PROJECTS: todos los autenticados pueden leer los proyectos, pero
-- solo admin/gerente pueden crear, editar o eliminar uno. Un
-- colaborador que intente crear un proyecto vía API sería rechazado
-- aquí, aunque la interfaz ya le oculte el botón.
create policy "proyectos: leer" on projects
  for select to authenticated using (true);
create policy "proyectos: crear admin/gerente" on projects
  for insert to authenticated with check (current_role_kollab() in ('admin','gerente'));
create policy "proyectos: editar admin/gerente" on projects
  for update to authenticated using (current_role_kollab() in ('admin','gerente'));
create policy "proyectos: borrar admin/gerente" on projects
  for delete to authenticated using (current_role_kollab() in ('admin','gerente'));

-- TASKS: todos leen las tareas; cualquier autenticado puede crear o
-- editar tareas (por ejemplo, un colaborador completando la suya
-- propia); pero solo admin/gerente pueden eliminarlas.
create policy "tareas: leer" on tasks
  for select to authenticated using (true);
create policy "tareas: crear" on tasks
  for insert to authenticated with check (true);
create policy "tareas: editar" on tasks
  for update to authenticated using (true);
create policy "tareas: borrar admin/gerente" on tasks
  for delete to authenticated using (current_role_kollab() in ('admin','gerente'));

-- COMMENTS: todos leen los comentarios de un proyecto; cada persona
-- solo puede publicar comentarios a su propio nombre (no puede hacerse
-- pasar por otro usuario al insertar un comentario).
create policy "comentarios: leer" on comments
  for select to authenticated using (true);
create policy "comentarios: crear propios" on comments
  for insert to authenticated with check (user_id = auth.uid());

-- AUDIT: la bitácora de auditoría solo puede LEERSE por admin/gerente
-- (un colaborador no debe ver el historial completo de la
-- organización); pero cualquier usuario autenticado puede insertar un
-- evento, porque las acciones que generan auditoría las puede hacer
-- cualquiera (ej. un colaborador completando una tarea).
create policy "auditoria: leer admin/gerente" on audit_log
  for select to authenticated using (current_role_kollab() in ('admin','gerente'));
create policy "auditoria: insertar" on audit_log
  for insert to authenticated with check (true);

-- INTEGRATIONS: todos pueden ver el estado de las integraciones, pero
-- solo el rol admin puede conectarlas o desconectarlas.
create policy "integraciones: leer" on integrations
  for select to authenticated using (true);
create policy "integraciones: modificar admin" on integrations
  for update to authenticated using (current_role_kollab() = 'admin');

-- =====================================================================
--  DATOS DE EJEMPLO (proyectos, tareas, integraciones)
--  Nota: las tareas no quedan asignadas a un usuario en este insert
--  inicial; eso se hace después de crear los usuarios reales en Auth,
--  actualizando assignee_id manualmente o desde la interfaz.
-- =====================================================================
insert into projects (name, description, status, deadline) values
  ('Migración Plataforma SaaS', 'Implementación de la plataforma integrada Kollab', 'curso', '2026-07-15'),
  ('Onboarding Equipo Remoto',  'Capacitación y adopción por área', 'riesgo', '2026-06-20'),
  ('Dashboard de KPIs Gerenciales', 'Vistas ejecutivas en tiempo real', 'curso', '2026-08-30');

insert into tasks (project_id, title, priority, done) values
  (1, 'Levantar requerimientos con CTO', 'alta', true),
  (1, 'Validar APIs de integración', 'alta', true),
  (1, 'Configurar RBAC y MFA', 'alta', false),
  (1, 'Migrar datos históricos', 'media', false),
  (2, 'Diseñar plan de capacitación', 'alta', true),
  (2, 'Designar champions por área', 'media', false),
  (2, 'Crear material de adopción', 'media', false),
  (3, 'Definir métricas con gerencia', 'alta', true),
  (3, 'Construir vistas ejecutivas', 'media', true);

insert into integrations (tool, status, last_sync) values
  ('Slack', 'conectado', now()),
  ('Google Drive', 'conectado', now()),
  ('Zoom', 'desconectado', null),
  ('Jira', 'desconectado', null),
  ('Trello', 'desconectado', null);

-- =====================================================================
--  FIN DEL ESQUEMA
-- =====================================================================
