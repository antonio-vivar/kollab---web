# Kollab — Plataforma Integrada de Gestión del Trabajo (Supabase)

MVP funcional del proyecto **Kollab** (GPY1101). Resuelve la fragmentación operativa
centralizando proyectos, tareas, carga laboral, comunicación trazable e integraciones
en una sola plataforma, sobre una base de datos en la nube.

## Tecnologías (coherentes con el informe)

| Capa | Tecnología | Requerimiento que cubre |
|------|-----------|--------------------------|
| Frontend | HTML5 + CSS3 + JavaScript (Vanilla) | UI, declarado en el MVP del informe |
| Base de datos | **Supabase (PostgreSQL en la nube)** | Fuente única de verdad, escalabilidad (RNF-05) |
| Autenticación | **Supabase Auth** (email + contraseña, soporta MFA) | Seguridad, MFA (RNF-03) |
| Autorización | **Row Level Security (RLS)** por rol | RBAC (RNF-03) |
| Transporte | HTTPS / TLS (provisto por Supabase) | Cifrado TLS 1.3 (RNF-03) |

## Puesta en marcha (paso a paso)

### 1. Crear el proyecto en Supabase
1. Entra a https://supabase.com y crea un proyecto nuevo (plan gratuito sirve).
2. Espera a que termine de aprovisionarse (1–2 minutos).

### 2. Crear la base de datos
1. En el menú lateral, abre **SQL Editor**.
2. Abre el archivo `schema.sql` de este proyecto, copia TODO su contenido y pégalo.
3. Presiona **Run**. Se crearán las tablas, las políticas RLS (RBAC) y los datos de ejemplo.

### 3. Crear los usuarios (Auth)
En el menú lateral, abre **Authentication > Users > Add user** y crea, por ejemplo:

| Email | Contraseña | Rol que tendrá |
|-------|-----------|----------------|
| admin@kollab.cl | (la que elijas) | admin |
| ceo@kollab.cl | (la que elijas) | gerente |
| colaborador@kollab.cl | (la que elijas) | colaborador |

> Marca la opción **Auto Confirm User** al crearlos para poder entrar de inmediato.

Al crear cada usuario, un *trigger* crea automáticamente su fila en la tabla `profiles`
con rol `colaborador`. Para asignar los roles `admin` y `gerente`:
1. Abre **Table Editor > profiles**.
2. Edita el campo `role` de cada usuario (admin / gerente / colaborador).
3. (Opcional) edita también el campo `name` para que muestre el nombre real.

### 4. Conectar el frontend
1. En Supabase abre **Project Settings > API** (o **Data API**).
2. Copia **Project URL** y la clave **anon public**.
3. Abre `public/config.js` y reemplaza los valores:
   ```js
   window.KOLLAB_CONFIG = {
     SUPABASE_URL: "https://tuproyecto.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGc..."
   };
   ```

### 5. Ejecutar la aplicación
El frontend es estático. Cualquiera de estas opciones funciona:
- Doble clic en `public/index.html`, **o**
- Servirlo localmente (recomendado):
  ```bash
  cd kollab-supabase/public
  python -m http.server 5500
  # abre http://localhost:5500
  ```
Inicia sesión con uno de los usuarios creados en el paso 3.

## Mapeo a los requerimientos del proyecto

| Requerimiento | Cómo se resuelve | Dónde verlo |
|---------------|------------------|-------------|
| **RF-01** Gestión de proyectos y tareas | Tablas `projects` y `tasks`; avance calculado automáticamente | Dashboard / Proyectos |
| **RF-02** Monitoreo de carga laboral | Carga por persona ponderada por prioridad, con alerta de sobrecarga | Pestaña Carga del equipo |
| **RF-03** Paneles de KPIs | Métricas en tiempo real (avance global, en riesgo, tareas pendientes) | Dashboard |
| **RF-04** Comunicación estructurada y trazable | Tabla `comments` por proyecto + `audit_log` de cada acción | Detalle de proyecto + pestaña Auditoría |
| **RF-05** Integración con herramientas | Tabla `integrations` (Slack, Drive, Zoom, Jira, Trello) con estado | Pestaña Integraciones |
| **RNF-03** Seguridad | Supabase Auth (contraseñas hasheadas + MFA), RLS para RBAC, TLS | Login + políticas RLS en `schema.sql` |
| **RNF-05** Escalabilidad | PostgreSQL gestionado por Supabase | Infraestructura cloud |

## Cómo se evidencia el RBAC (para la defensa)
- Inicia sesión como **colaborador**: NO verá el botón "Nuevo proyecto" ni la pestaña "Auditoría",
  y si intentara crear un proyecto, las políticas RLS de la base de datos lo rechazan.
- Inicia sesión como **admin/gerente**: puede crear/eliminar proyectos y ver la auditoría.
  El control no está solo en la interfaz: está **en la base de datos** (RLS), que es la forma correcta.

## Alcance del MVP vs. producción
Implementado: autenticación real, RBAC por RLS, proyectos, tareas, carga, KPIs, comentarios,
auditoría e integraciones (registro y estado), todo sobre PostgreSQL en la nube.
Fuera de alcance (despliegue productivo): activación de MFA por usuario, sincronización
bidireccional efectiva con las APIs reales de cada herramienta y notificaciones en tiempo real.
Supabase ya provee la base para todo ello (Auth con MFA, Realtime y Edge Functions).

## Estructura
```
kollab-supabase/
├── schema.sql              # base de datos completa (pegar en Supabase SQL Editor)
├── README.md
└── public/
    ├── index.html
    ├── styles.css
    ├── config.js           # <-- pega aquí tu URL y anon key
    └── app.js              # cliente conectado a Supabase
```
