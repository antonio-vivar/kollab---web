# Kollab — Plataforma Integrada de Gestión del Trabajo

Solución de software del proyecto **Kollab** (GPY1101 — Evaluación de Proyectos de Software).
Aplicación web full-stack que resuelve la fragmentación operativa de Kollab centralizando
la gestión de proyectos, tareas, carga laboral, comunicación trazable e integraciones en una
única fuente de verdad.

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Backend / API REST | Node.js + Express |
| Base de datos operativa | SQLite (módulo nativo `node:sqlite`) — reemplazable por PostgreSQL / Supabase en producción |
| Seguridad | JWT (sesiones), bcryptjs (hashing de contraseñas), RBAC (roles) |
| Frontend | HTML5 + CSS3 + JavaScript (Vanilla, ES6) consumiendo la API vía `fetch` |

## Cómo ejecutar

Requisito: Node.js 22 o superior (incluye el módulo `node:sqlite`).

```bash
cd kollab-app
npm install          # instala express, bcryptjs, jsonwebtoken
npm start            # levanta el servidor en http://localhost:3000
```

Luego abre `http://localhost:3000` en el navegador.

### Cuentas de demostración

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@kollab.cl | admin123 | admin |
| ceo@kollab.cl | gerente123 | gerente |
| colaborador@kollab.cl | colab123 | colaborador |

La base de datos `kollab.db` se crea y se puebla automáticamente al primer arranque.
Para reiniciar los datos, elimina `kollab.db` (y `kollab.db-wal`, `kollab.db-shm`) y vuelve a iniciar.

## Mapeo a los requerimientos del proyecto

| Requerimiento (EP1) | Cómo se resuelve | Evidencia |
|---------------------|------------------|-----------|
| **RF-01** Gestión de proyectos y tareas | CRUD de proyectos y tareas con cálculo automático de avance | Pestaña Dashboard / Proyectos · endpoints `/api/projects`, `/api/tasks` |
| **RF-02** Monitoreo de carga laboral | Carga por persona ponderada por prioridad, con alerta de sobrecarga | Pestaña Carga del equipo · `/api/workload` |
| **RF-03** Paneles de KPIs y métricas | KPIs en tiempo real (avance global, proyectos en riesgo, tareas pendientes) | Dashboard · `/api/kpis` |
| **RF-04** Comunicación estructurada y trazable | Hilo de comentarios por proyecto + bitácora de auditoría de cada acción | Detalle de proyecto + pestaña Auditoría · `/api/.../comments`, `/api/audit` |
| **RF-05** Integración con herramientas existentes | Registro de conectores (Slack, Drive, Zoom, Jira, Trello) con estado y sincronización | Pestaña Integraciones · `/api/integrations` |
| **RNF-03** Seguridad | Contraseñas hasheadas (bcrypt), sesiones con JWT, control de acceso por rol (RBAC) y auditoría de eventos | Pantalla de login + control 401/403 en toda la API |

## Necesidades organizacionales resueltas (EP1)

1. **Plataforma integrada de gestión** → todo el trabajo en una sola aplicación y una sola base de datos (fin de la fragmentación de 7+ herramientas).
2. **Gestión de carga laboral** → vista de carga ponderada que detecta sobrecarga por persona.
3. **Comunicación estructurada y trazable** → comentarios por proyecto + bitácora de auditoría inmutable.
4. **Paneles de monitoreo y métricas confiables** → KPIs calculados en tiempo real desde la fuente de datos única.
5. **Integración con herramientas existentes** → módulo de conectores para la transición gradual.

## Alcance (MVP) vs. sistema en producción

Implementado y funcional: autenticación, RBAC, proyectos, tareas, carga, KPIs, comentarios,
auditoría e integraciones (registro y estado), todo sobre una API REST real y base de datos persistente.

Fuera de este alcance (corresponde al despliegue productivo): MFA real con TOTP, sincronización
bidireccional efectiva con las APIs externas de cada herramienta, notificaciones en tiempo real
(WebSockets), y despliegue en la nube con el SLA ≥ 99,5%. La arquitectura ya contempla estos
puntos: la capa de datos es intercambiable por PostgreSQL/Supabase y la API está lista para
recibir webhooks de los conectores.

## Estructura del proyecto

```
kollab-app/
├── server.js              # API REST + autenticación + RBAC + auditoría
├── db.js                  # capa de datos (SQLite) + esquema + datos semilla
├── package.json
└── public/
    ├── index.html         # interfaz (login + dashboard + vistas)
    ├── styles.css
    └── app.js             # cliente que consume la API
```
