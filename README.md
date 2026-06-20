# Kollab — Plataforma de Gestión del Trabajo Remoto e Híbrido

Prototipo (MVP) que demuestra cómo se vería una plataforma integrada para
centralizar la **gestión de proyectos y tareas**, el **monitoreo de carga
laboral**, los **KPIs en tiempo real**, la **comunicación trazable** y el
**registro de integraciones**, resolviendo la fragmentación operativa
descrita en el caso Kollab.

> Proyecto académico — GPY1101 (Evaluación de Proyectos de Software).
> Equipo: Antonio Vivar — Francisco Levipil.

## 🎯 Qué es este MVP y qué no es

Este repositorio **no contiene la solución final** que recomienda el
informe. El informe concluye que Kollab debe **adquirir e integrar una
plataforma SaaS** (Opción A: Monday.com, ClickUp, etc.), no construir un
sistema propio desde cero.

Lo que hay aquí es un **prototipo de validación**: una aplicación web que
reproduce la experiencia de usuario, los roles y los requerimientos
funcionales que la organización necesita, para comprobar que el equipo
entendió el problema **antes** de comprometer la inversión en un proveedor
real. No reemplaza la decisión de comprar el SaaS — la valida.

Por eso el MVP **no tiene base de datos ni backend real**: el login se
valida contra un conjunto fijo de credenciales en el propio navegador, y
todos los datos (proyectos, tareas, comentarios, auditoría) se guardan en
`localStorage`, el almacenamiento local del navegador. Los cambios
sobreviven a recargar la página, pero no se sincronizan entre dispositivos
ni con ningún servidor.

## 📁 Estructura del repositorio

```
kollab---web/
├── frontend/         # MVP: React + Vite + TypeScript + Tailwind/shadcn-ui (100% local, sin backend)
├── backend/          # Diseño de base de datos para una fase futura (Supabase/PostgreSQL) — NO conectado al MVP
├── legacy-sqlite/    # Implementación alternativa anterior con Node/Express + SQLite (referencia histórica)
└── README.md
```

## 🏛️ Arquitectura actual (MVP)

```
┌────────────────────────────────────────────┐
│  frontend/  (navegador)                     │
│  ┌────────────┐   ┌──────────────────────┐  │
│  │  auth.ts   │   │   storage.ts         │  │
│  │  login     │   │   localStorage       │  │
│  │  local     │   │   (proyectos, tareas,│  │
│  │            │   │    auditoría, etc.)  │  │
│  └────────────┘   └──────────────────────┘  │
└────────────────────────────────────────────┘
```

No hay servidor, no hay base de datos, no hay llamadas de red para los
datos de la aplicación. Todo corre en el navegador del usuario.

## 🔮 Arquitectura prevista para producción (no implementada)

`backend/schema.sql` documenta cómo se vería el control de acceso por rol
implementado en una base de datos real (Supabase/PostgreSQL con Row Level
Security), en caso de que la organización necesite una capa de datos
propia además del SaaS contratado. **Es un diseño, no algo en
funcionamiento** — ver el detalle en [`backend/README.md`](backend/README.md).

## 🧱 Stack tecnológico del MVP

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 |
| Lenguaje | TypeScript |
| Herramienta de build | Vite |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Enrutamiento | TanStack Router (rutas basadas en archivos) |
| Autenticación | Local, en el navegador (`frontend/src/lib/auth.ts`) |
| Persistencia | `localStorage` (`frontend/src/lib/storage.ts`) |

## 🔐 Roles (RBAC) — implementado a nivel de interfaz

| Rol | Puede | No puede |
|-----|-------|----------|
| **admin** | Ver todo, crear/eliminar proyectos y tareas, conectar/desconectar integraciones, ver auditoría completa | — |
| **gerente** | Crear/eliminar proyectos y tareas, asignar responsables, ver auditoría | Conectar/desconectar integraciones |
| **colaborador** | Ver sus proyectos, crear y completar tareas (como responsable de sí mismo), comentar | Eliminar tareas/proyectos, reasignar responsables, ver la pestaña de auditoría, conectar integraciones |

En esta versión del MVP, el control de roles se aplica **en la interfaz**
(mostrando u ocultando botones y pestañas según el rol). El diseño de cómo
se reforzaría a nivel de base de datos —para que sea imposible saltárselo
aunque alguien manipule el frontend— está documentado en `backend/schema.sql`
mediante políticas de Row Level Security, pero no está activo en este MVP.

## 🚀 Puesta en marcha

```bash
cd frontend
npm install
npm run dev
```

Abrir `http://localhost:8080`. En la pantalla de login, usar cualquiera de
las 3 cuentas de demostración (o pulsar el botón de "acceso rápido" del rol
que se quiera probar):

| Rol | Correo | Contraseña |
|-----|--------|------------|
| admin | admin@kollab.cl | admin123 |
| gerente | ceo@kollab.cl | gerente123 |
| colaborador | colaborador@kollab.cl | colab123 |

No se requiere ninguna variable de entorno ni cuenta externa: el proyecto
funciona completo con solo `npm install` y `npm run dev`.

## 🌿 Ramas

- **main** — versión estable (la que se usa para la entrega/defensa).
- **dev** — desarrollo activo; los cambios se prueban aquí antes de pasar a `main`.

## ✨ Requerimientos funcionales demostrados

| Requerimiento | Cómo lo cubre el MVP |
|---|---|
| **RF-01** Gestión de proyectos y tareas | Crear, completar y eliminar tareas; avance calculado automáticamente según tareas completadas |
| **RF-02** Monitoreo de carga laboral | Vista "Carga del equipo" con porcentaje de ocupación por persona y alerta de sobrecarga |
| **RF-03** Panel de KPIs en tiempo real | Dashboard con proyectos activos, avance promedio, proyectos en riesgo y tareas pendientes |
| **RF-04** Comunicación trazable | Comentarios por proyecto + bitácora de auditoría con cada acción registrada |
| **RF-05** Registro de integraciones | Pestaña de integraciones (Slack, Drive, Zoom, Jira, Trello) con estado simulado y vista previa de ejemplo |

## 📌 Alcance y limitaciones del MVP

**Implementado:** los 5 requerimientos funcionales de la EP1, control de
acceso por rol a nivel de interfaz, persistencia local de los cambios.

**Fuera de alcance (corresponde a la fase de implementación real):**
- Conexión a una base de datos real o a un backend.
- Sincronización de datos entre distintos usuarios o dispositivos.
- Conexión real con las APIs de Slack, Drive, Zoom, Jira o Trello (la
  vista previa de cada integración usa datos de ejemplo fijos).
- Seguridad reforzada a nivel de base de datos (ver diseño en `backend/`).
