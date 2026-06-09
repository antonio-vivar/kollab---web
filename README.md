# Kollab — Plataforma de Gestión del Trabajo Remoto e Híbrido

Plataforma integrada que centraliza la **gestión de proyectos y tareas**, el **monitoreo de carga laboral**, los **KPIs en tiempo real**, la **comunicación trazable** y el **registro de integraciones** en una sola herramienta. Resuelve la fragmentación operativa de los equipos remotos e híbridos.

> Proyecto académico — GPY1101 (Evaluación de Proyectos de Software).

## 📁 Estructura del repositorio

```
kollab---web/
├── kollab-supabase/     # Versión sobre Supabase (PostgreSQL en la nube) — principal
│   ├── public/          # Frontend (HTML + CSS + JS)
│   └── schema.sql       # Esquema de base de datos + políticas RLS (RBAC)
└── kollab-app/          # Versión alternativa: backend Express + SQLite local
```

## 🧱 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + CSS3 + JavaScript |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth (email + contraseña) |
| Autorización | Row Level Security (RLS) por rol |

## 🔐 Roles (RBAC)

| Rol | Permisos |
|-----|----------|
| **admin** | Acceso total: proyectos, tareas, integraciones y auditoría |
| **gerente** | Gestiona proyectos/tareas y ve auditoría; no administra integraciones |
| **colaborador** | Crea y completa tareas, comenta; no borra, no asigna, no ve auditoría |

## 🚀 Puesta en marcha (versión Supabase)

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecutar el contenido de `kollab-supabase/schema.sql`.
3. Crear usuarios en **Authentication → Users** y asignar su `role` en la tabla `profiles`.
4. Copiar la **Project URL** y la **publishable key** en `kollab-supabase/public/config.js`.
5. Servir la carpeta `public/` (por ejemplo: `python -m http.server 8090`).

## 🌿 Ramas

- **main** — versión estable.
- **dev** — desarrollo activo.

## ✨ Funcionalidades

- **RF-01** Gestión de proyectos y tareas con avance automático.
- **RF-02** Monitoreo de carga laboral por persona.
- **RF-03** Panel de KPIs en tiempo real.
- **RF-04** Comunicación trazable + bitácora de auditoría.
- **RF-05** Registro y estado de integraciones (Slack, Drive, Zoom, Jira, Trello).
