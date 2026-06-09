-- =====================================================================
--  KOLLAB — Plataforma Integrada de Gestión del Trabajo
--  Esquema de base de datos para Supabase (PostgreSQL)
--  GPY1101 — Evaluación de Proyectos de Software
--
--  CÓMO USAR:
--   1. En tu proyecto de Supabase, ve a "SQL Editor".
--   2. Pega TODO este archivo y presiona "Run".
--   3. Crea los usuarios demo en Authentication > Users (ver README).
-- =====================================================================

-- ---------- LIMPIEZA (para re-ejecutar sin errores) ----------
drop table if exists audit_log cascade;
drop table if exists comments cascade;
drop table if exists tasks cascade;
drop table if exists projects cascade;
drop table if exists integrations cascade;
drop table if exists profiles cascade;

-- =====================================================================
--  TABLAS
-- =====================================================================

-- Perfiles de usuario (extiende auth.users de Supabase) -> RBAC
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null default 'colaborador'
              check (role in ('admin','gerente','colaborador')),
  created_at  timestamptz not null default now()
);

-- RF-01: Proyectos
create table projects (
  id          bigint generated always as identity primary key,
  name        text not null,
  description text,
  status      text not null default 'curso'
              check (status in ('curso','riesgo','completado')),
  deadline    date,
  created_at  timestamptz not null default now()
);

-- RF-01: Tareas
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

-- RF-04: Comunicación estructurada y trazable
create table comments (
  id          bigint generated always as identity primary key,
  project_id  bigint not null references projects(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- RF-04 / RNF-03: Bitácora de auditoría (trazabilidad)
create table audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid references profiles(id) on delete set null,
  action      text not null,
  detail      text,
  created_at  timestamptz not null default now()
);

-- RF-05: Integraciones con herramientas existentes
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
create or replace function current_role_kollab()
returns text language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

-- Al crear un usuario en Auth, se crea su perfil automáticamente
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'colaborador')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
--  ROW LEVEL SECURITY (RBAC) — RNF-03 seguridad
-- =====================================================================
alter table profiles     enable row level security;
alter table projects     enable row level security;
alter table tasks        enable row level security;
alter table comments     enable row level security;
alter table audit_log    enable row level security;
alter table integrations enable row level security;

-- PROFILES: cada quien ve su perfil; todos los autenticados pueden listar nombres
create policy "perfiles visibles a autenticados" on profiles
  for select to authenticated using (true);
create policy "actualiza tu propio perfil" on profiles
  for update to authenticated using (id = auth.uid());

-- PROJECTS: todos los autenticados leen; solo admin/gerente crean, editan o borran
create policy "proyectos: leer" on projects
  for select to authenticated using (true);
create policy "proyectos: crear admin/gerente" on projects
  for insert to authenticated with check (current_role_kollab() in ('admin','gerente'));
create policy "proyectos: editar admin/gerente" on projects
  for update to authenticated using (current_role_kollab() in ('admin','gerente'));
create policy "proyectos: borrar admin/gerente" on projects
  for delete to authenticated using (current_role_kollab() in ('admin','gerente'));

-- TASKS: todos leen; cualquier autenticado crea/edita; admin/gerente borra
create policy "tareas: leer" on tasks
  for select to authenticated using (true);
create policy "tareas: crear" on tasks
  for insert to authenticated with check (true);
create policy "tareas: editar" on tasks
  for update to authenticated using (true);
create policy "tareas: borrar admin/gerente" on tasks
  for delete to authenticated using (current_role_kollab() in ('admin','gerente'));

-- COMMENTS: todos leen; cada quien escribe a su nombre
create policy "comentarios: leer" on comments
  for select to authenticated using (true);
create policy "comentarios: crear propios" on comments
  for insert to authenticated with check (user_id = auth.uid());

-- AUDIT: solo admin/gerente lo lee; cualquiera puede insertar su evento
create policy "auditoria: leer admin/gerente" on audit_log
  for select to authenticated using (current_role_kollab() in ('admin','gerente'));
create policy "auditoria: insertar" on audit_log
  for insert to authenticated with check (true);

-- INTEGRATIONS: todos leen; solo admin modifica
create policy "integraciones: leer" on integrations
  for select to authenticated using (true);
create policy "integraciones: modificar admin" on integrations
  for update to authenticated using (current_role_kollab() = 'admin');

-- =====================================================================
--  DATOS DE EJEMPLO (proyectos, tareas, integraciones)
--  Nota: las tareas se asignan a usuarios después de crearlos en Auth.
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
