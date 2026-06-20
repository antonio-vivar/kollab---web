# Kollab — Diseño de base de datos (fase de producción)

> ⚠️ **Este backend NO está conectado al MVP que corre hoy.** El MVP actual
> (carpeta `frontend/`) funciona 100% en el navegador, sin servidor ni base
> de datos: usa un login local contra credenciales fijas (`frontend/src/lib/auth.ts`)
> y guarda los datos en `localStorage` (`frontend/src/lib/storage.ts`). Este
> documento describe el diseño de la base de datos pensado para la **siguiente
> fase**, cuando se implemente la plataforma SaaS real (Opción A del informe EP3).

## Por qué existe este archivo si no está conectado

El informe EP3 recomienda adquirir e integrar una plataforma SaaS (Monday,
ClickUp, Jira, etc.), no construir un backend propio. `schema.sql` no es el
backend de producción de Kollab — es una **prueba de diseño**: muestra cómo
se implementaría el control de acceso por rol (RBAC) a nivel de base de
datos con Supabase/PostgreSQL, en caso de que se necesite una capa propia de
datos (por ejemplo, para almacenar métricas internas que el SaaS contratado
no cubra). Se mantiene en el repositorio como evidencia técnica de que el
equipo diseñó también esa alternativa, no como parte del MVP que se demuestra
en la defensa oral.

## Qué contiene `schema.sql`

| Elemento | Para qué sirve |
|---|---|
| Tablas `profiles`, `projects`, `tasks`, `comments`, `audit_log`, `integrations` | Modelo de datos equivalente al que usa el MVP, pero en una base real |
| Función `current_role_kollab()` | Devuelve el rol del usuario autenticado, para usarlo en las políticas de seguridad |
| Trigger `on_auth_user_created` | Crea automáticamente el perfil (con rol `colaborador` por defecto) al registrar un usuario nuevo |
| Políticas de **Row Level Security (RLS)** | Implementan el RBAC directamente en la base de datos: cada tabla define qué rol puede leer, crear, editar o eliminar cada fila |

## Cómo probarlo (opcional, fuera del alcance del MVP actual)

Si se quisiera levantar esta base de datos solo para comprobar que el
diseño funciona (no es necesario para la defensa, que usa el MVP local):

1. Crear un proyecto gratuito en [supabase.com](https://supabase.com).
2. Abrir **SQL Editor**, pegar todo el contenido de `schema.sql` y ejecutar.
3. En **Authentication → Users**, crear 3 usuarios de prueba y, en
   **Table Editor → profiles**, asignarles los roles `admin`, `gerente` y
   `colaborador` respectivamente.
4. Verificar en **Table Editor** que, por ejemplo, un usuario con rol
   `colaborador` no puede insertar filas en `projects` ni leer `audit_log`
   (las políticas RLS deben rechazarlo).

## Mapeo a los requerimientos del proyecto

| Requerimiento | Cómo lo resolvería esta base de datos | Cómo lo resuelve el MVP actual |
|---|---|---|
| RF-01 Proyectos y tareas | Tablas `projects` / `tasks` | Arreglos en memoria, persistidos en `localStorage` |
| RF-02 Carga laboral | (no modelada aún; se calcularía desde `tasks`) | Datos fijos de ejemplo en `index.tsx` |
| RF-03 KPIs | Se calcularían con consultas sobre `projects`/`tasks` | Calculados en el cliente a partir del estado local |
| RF-04 Comunicación trazable | Tablas `comments` y `audit_log` | Arreglos locales `comments` / `audit` |
| RF-05 Integraciones | Tabla `integrations` | Arreglo local con vista previa simulada |
| RNF-03 Seguridad | RLS por rol, a nivel de base de datos | Solo a nivel de interfaz (oculta botones/pestañas según rol) |
