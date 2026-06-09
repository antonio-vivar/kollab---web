# Kollab — Plataforma de Gestión del Trabajo Remoto e Híbrido

Plataforma integrada que centraliza la **gestión de proyectos y tareas**, el **monitoreo de carga laboral**, los **KPIs en tiempo real**, la **comunicación trazable** y el **registro de integraciones** en una sola herramienta. Resuelve la fragmentación operativa de los equipos remotos e híbridos.

> Proyecto académico — GPY1101 (Evaluación de Proyectos de Software).

## 📁 Estructura del repositorio

```
kollab---web/
├── frontend/         # Capa de presentación: HTML5 + CSS3 + JavaScript (consume Supabase)
├── backend/          # Backend-as-code: schema.sql (tablas, RLS/RBAC, triggers y funciones)
├── legacy-sqlite/    # Implementación alternativa con Node/Express + SQLite (referencia)
└── README.md
```

## 🏛️ Arquitectura

```
┌──────────────┐        HTTPS        ┌─────────────────────────────┐
│  frontend/   │  ───────────────▶   │  Supabase (nube)            │
│  (navegador) │   supabase-js       │  PostgreSQL + Auth + RLS    │
└──────────────┘  ◀───────────────   └─────────────────────────────┘
                                       ▲
                     se define con     │
                     backend/schema.sql ┘
```

- **Frontend** (`frontend/`): aplicación web que consume Supabase mediante `supabase-js`.
- **Backend** (`backend/schema.sql`): definición declarativa de la base de datos, las políticas de seguridad por rol (Row Level Security) y los triggers. **No requiere servidor propio**: se ejecuta sobre Supabase/PostgreSQL gestionado en la nube.
- **legacy-sqlite/**: versión autónoma con backend Express + SQLite, conservada como referencia.

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

## 🚀 Puesta en marcha

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecutar el contenido de `backend/schema.sql`.
3. Crear usuarios en **Authentication → Users** y asignar su `role` en la tabla `profiles`.
4. Copiar la **Project URL** y la **publishable key** en `frontend/config.js`.
5. Servir la carpeta `frontend/` (por ejemplo: `python -m http.server 8090`) y abrir `http://localhost:8090`.

Más detalle de configuración en [`backend/README.md`](backend/README.md).

## 🌿 Ramas

- **main** — versión estable (para entrega/defensa).
- **dev** — desarrollo activo; los cambios se prueban aquí antes de pasar a `main`.

## ✨ Funcionalidades

- **RF-01** Gestión de proyectos y tareas con avance automático.
- **RF-02** Monitoreo de carga laboral por persona.
- **RF-03** Panel de KPIs en tiempo real.
- **RF-04** Comunicación trazable + bitácora de auditoría.
- **RF-05** Registro y estado de integraciones (Slack, Drive, Zoom, Jira, Trello).
