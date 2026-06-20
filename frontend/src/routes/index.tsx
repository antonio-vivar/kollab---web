import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, FolderKanban, Users2, Plug, ScrollText, LogOut,
  Plus, X, Send, CheckCircle2, AlertTriangle, Clock, TrendingUp,
  MessageSquare, Trash2, Sparkles,
} from "lucide-react";
import { signInLocal, DEMO_CREDENTIALS } from "../lib/auth";
import { usePersistentState } from "../lib/storage";

// Registra esta página como la ruta raíz ("/") de la aplicación, usando
// el sistema de rutas basado en archivos de TanStack Router. "head" define
// el título y la descripción que aparecen en la pestaña del navegador y
// en buscadores; "component" es lo que realmente se renderiza.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kollab — Gestión del Trabajo Remoto e Híbrido" },
      { name: "description", content: "Plataforma colaborativa para gestionar proyectos, tareas, equipos e integraciones en entornos remotos e híbridos." },
    ],
  }),
  component: KollabApp,
});

/* ============================ TIPOS ============================
   Definiciones de TypeScript para las estructuras de datos del MVP.
   No generan código en tiempo de ejecución: solo permiten que el editor
   y el compilador avisen si, por ejemplo, se intenta asignar un texto
   cualquiera donde se espera uno de los 3 roles válidos. */
type Role = "admin" | "gerente" | "colaborador";
type Priority = "Alta" | "Media" | "Baja";
type ProjectStatus = "En curso" | "En riesgo" | "Completado";

interface User { id: string; name: string; role: Role; initials: string; color: string; }
interface Task { id: string; title: string; assignee: string; priority: Priority; done: boolean; }
interface Comment { id: string; author: string; date: string; message: string; }
interface Project {
  id: string; name: string; description: string; status: ProjectStatus;
  dueDate: string; tasks: Task[]; comments: Comment[];
}
interface AuditEntry { id: string; date: string; action: string; user: string; detail: string; }
interface Integration {
  id: string; name: string; icon: string; connected: boolean; lastSync: string | null;
  syncing?: boolean; // true mientras dura la animación de "conectando..."
}

/* ============================ MOCK ============================
   Datos de ejemplo que alimentan toda la demo. No vienen de ninguna
   base de datos: viven directamente en el código y se usan como valor
   inicial la primera vez que se abre la app (después, lo que el usuario
   modifique se guarda en localStorage mediante usePersistentState). */

// Los 3 usuarios de la demo, en el mismo orden y roles que las cuentas
// de auth.ts. Se usan para mostrar los botones de "acceso rápido" en
// el login, no para la validación de credenciales en sí.
const USERS: User[] = [
  { id: "u1", name: "Antonio Vivar", role: "admin", initials: "AV", color: "#00BCD4" },
  { id: "u2", name: "Carla Méndez", role: "gerente", initials: "CM", color: "#26A69A" },
  { id: "u3", name: "Diego Soto", role: "colaborador", initials: "DS", color: "#1E88E5" },
];

// Lista de nombres del equipo, usada para llenar el selector de
// "responsable" cuando un admin/gerente crea una tarea nueva.
const TEAM = ["Antonio Vivar", "Carla Méndez", "Diego Soto", "Lucía Ramírez", "Marcos Bravo", "Sofía Núñez"];

// 4 proyectos de ejemplo con sus tareas y comentarios ya cargados,
// para que la demo no arranque con pantallas vacías.
const INITIAL_PROJECTS: Project[] = [
  {
    id: "p1", name: "Lanzamiento Plataforma 2.0",
    description: "Rediseño completo del producto y migración de usuarios al nuevo entorno.",
    status: "En curso", dueDate: "2026-07-15",
    tasks: [
      { id: "t1", title: "Definir arquitectura de microservicios", assignee: "Antonio Vivar", priority: "Alta", done: true },
      { id: "t2", title: "Diseñar nuevo sistema de identidad visual", assignee: "Sofía Núñez", priority: "Media", done: true },
      { id: "t3", title: "Migrar base de usuarios activos", assignee: "Carla Méndez", priority: "Alta", done: false },
      { id: "t4", title: "Documentar API pública", assignee: "Diego Soto", priority: "Baja", done: false },
      { id: "t5", title: "Pruebas de carga", assignee: "Marcos Bravo", priority: "Media", done: false },
    ],
    comments: [
      { id: "c1", author: "Carla Méndez", date: "2026-06-02 10:24", message: "Equipo, recuerden cerrar el alcance del MVP esta semana." },
      { id: "c2", author: "Diego Soto", date: "2026-06-03 16:10", message: "Subí el primer borrador de la documentación al repositorio." },
    ],
  },
  {
    id: "p2", name: "Campaña Q3 Latinoamérica",
    description: "Estrategia de adquisición y contenidos para mercados de habla hispana.",
    status: "En riesgo", dueDate: "2026-06-30",
    tasks: [
      { id: "t6", title: "Brief creativo", assignee: "Sofía Núñez", priority: "Alta", done: true },
      { id: "t7", title: "Plan de medios pagos", assignee: "Lucía Ramírez", priority: "Alta", done: false },
      { id: "t8", title: "Producción de piezas gráficas", assignee: "Sofía Núñez", priority: "Media", done: false },
      { id: "t9", title: "Coordinar influencers regionales", assignee: "Carla Méndez", priority: "Media", done: false },
    ],
    comments: [
      { id: "c3", author: "Antonio Vivar", date: "2026-06-04 09:00", message: "Necesitamos acelerar la producción gráfica, vamos justos de tiempo." },
    ],
  },
  {
    id: "p3", name: "Implementación CRM Interno",
    description: "Despliegue del nuevo CRM para los equipos de ventas y soporte.",
    status: "Completado", dueDate: "2026-05-20",
    tasks: [
      { id: "t10", title: "Migración de datos históricos", assignee: "Marcos Bravo", priority: "Alta", done: true },
      { id: "t11", title: "Capacitación al equipo", assignee: "Carla Méndez", priority: "Media", done: true },
      { id: "t12", title: "Configuración de tableros", assignee: "Diego Soto", priority: "Baja", done: true },
    ],
    comments: [
      { id: "c4", author: "Carla Méndez", date: "2026-05-21 12:00", message: "Excelente trabajo equipo, proyecto cerrado." },
    ],
  },
  {
    id: "p4", name: "Programa de Onboarding Remoto",
    description: "Diseño del proceso de bienvenida e integración para nuevos colaboradores distribuidos.",
    status: "En curso", dueDate: "2026-08-10",
    tasks: [
      { id: "t13", title: "Mapear journey del nuevo colaborador", assignee: "Lucía Ramírez", priority: "Alta", done: true },
      { id: "t14", title: "Crear material audiovisual", assignee: "Sofía Núñez", priority: "Media", done: false },
      { id: "t15", title: "Programar sesiones de mentoría", assignee: "Antonio Vivar", priority: "Baja", done: false },
    ],
    comments: [],
  },
];

// Historial de auditoría de ejemplo (RF-04 / RNF-03). Cada acción real
// que el usuario haga en la app (completar tarea, comentar, etc.) se
// agrega arriba de esta lista mediante la función addAudit.
const INITIAL_AUDIT: AuditEntry[] = [
  { id: "a1", date: "2026-06-05 14:32", action: "Creación de proyecto", user: "Antonio Vivar", detail: "Se creó el proyecto «Programa de Onboarding Remoto»." },
  { id: "a2", date: "2026-06-05 11:08", action: "Integración conectada", user: "Antonio Vivar", detail: "Conexión establecida con Slack." },
  { id: "a3", date: "2026-06-04 18:21", action: "Tarea completada", user: "Sofía Núñez", detail: "Se completó la tarea «Brief creativo» en Campaña Q3 Latinoamérica." },
  { id: "a4", date: "2026-06-04 09:00", action: "Comentario publicado", user: "Antonio Vivar", detail: "Nuevo comentario en Campaña Q3 Latinoamérica." },
  { id: "a5", date: "2026-06-03 16:10", action: "Comentario publicado", user: "Diego Soto", detail: "Nuevo comentario en Lanzamiento Plataforma 2.0." },
  { id: "a6", date: "2026-06-02 10:24", action: "Asignación de tarea", user: "Carla Méndez", detail: "Se asignó «Migrar base de usuarios activos» a Carla Méndez." },
];

// Estado inicial de las 5 integraciones simuladas (RF-05). "connected"
// define si arrancan ya conectadas o no; "lastSync" es solo decorativo.
const INITIAL_INTEGRATIONS: Integration[] = [
  { id: "slack", name: "Slack", icon: "💬", connected: true, lastSync: "2026-06-05 14:30" },
  { id: "drive", name: "Google Drive", icon: "📁", connected: true, lastSync: "2026-06-05 09:12" },
  { id: "zoom", name: "Zoom", icon: "🎥", connected: false, lastSync: null },
  { id: "jira", name: "Jira", icon: "🧩", connected: true, lastSync: "2026-06-04 17:45" },
  { id: "trello", name: "Trello", icon: "📋", connected: false, lastSync: null },
];

// Contenido de ejemplo que se muestra al expandir la "vista previa" de
// cada integración conectada. Simula lo que cada herramienta mostraría
// si estuviera realmente integrada (no son datos reales de ninguna API).
const INTEGRATION_PREVIEW: Record<string, { title: string; items: string[] }> = {
  slack: { title: "Canales recientes", items: ["#general · 12 mensajes nuevos", "#proyecto-plataforma · 4 hilos activos", "#diseño · última actividad hace 8 min"] },
  drive: { title: "Archivos compartidos", items: ["Brief_Campaña_Q3.pdf", "Mockups_Plataforma_v2.fig", "Plan_Onboarding_2026.docx"] },
  zoom: { title: "Próximas reuniones", items: ["Daily de equipo · hoy 10:00", "Revisión de sprint · mañana 15:00", "1:1 Carla – Antonio · viernes 11:00"] },
  jira: { title: "Tickets recientes", items: ["KOL-128 En progreso · Migración usuarios", "KOL-129 En revisión · API pública", "KOL-130 Pendiente · Pruebas de carga"] },
  trello: { title: "Tableros disponibles", items: ["Backlog Producto", "Roadmap Marketing", "Operaciones Internas"] },
};

// Datos fijos de carga laboral por persona (RF-02). "load" es el
// porcentaje de ocupación; se usa para decidir el color de la barra y
// si se muestra la etiqueta de "Sobrecargado".
const WORKLOAD = [
  { name: "Antonio Vivar", pending: 4, total: 9, load: 72 },
  { name: "Carla Méndez", pending: 6, total: 11, load: 88 },
  { name: "Diego Soto", pending: 3, total: 7, load: 55 },
  { name: "Lucía Ramírez", pending: 2, total: 6, load: 42 },
  { name: "Marcos Bravo", pending: 5, total: 9, load: 81 },
  { name: "Sofía Núñez", pending: 4, total: 8, load: 68 },
];

/* ============================ APP ============================
   Componente raíz. Controla en qué "etapa" está la aplicación:
   pantalla de bienvenida -> login -> app principal. No conoce los
   detalles de cada pantalla, solo decide cuál mostrar. */
function KollabApp() {
  const [stage, setStage] = useState<"welcome" | "login" | "app">("welcome");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // La pantalla de bienvenida se muestra sola por 2.2 segundos y luego
  // pasa automáticamente al login (efecto tipo "splash screen").
  useEffect(() => {
    if (stage === "welcome") {
      const t = setTimeout(() => setStage("login"), 2200);
      return () => clearTimeout(t); // evita el cambio de pantalla si el componente se desmonta antes
    }
  }, [stage]);

  if (stage === "welcome") return <WelcomeScreen />;
  if (stage === "login" || !currentUser) {
    return <LoginScreen onLogin={(u) => { setCurrentUser(u); setStage("app"); }} />;
  }
  return <MainApp user={currentUser} onLogout={() => { setCurrentUser(null); setStage("login"); }} />;
}

/* ============================ WELCOME ============================
   Pantalla inicial con el logo "K" y el nombre de la marca. Es
   puramente decorativa: no recibe props ni maneja estado propio. */
function WelcomeScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background overflow-hidden">
      <div className="absolute inset-0 opacity-60"
        style={{ background: "radial-gradient(800px 500px at 50% 50%, rgba(0,188,212,0.25), transparent 70%)" }} />
      <div className="anim-fade-up text-center relative">
        <div className="mx-auto mb-6 w-28 h-28 rounded-3xl glass-strong flex items-center justify-center anim-scale-in"
          style={{ boxShadow: "0 20px 60px -10px rgba(0,188,212,0.45)" }}>
          <span className="text-6xl font-extrabold bg-gradient-to-br from-[#26A69A] to-[#00BCD4] bg-clip-text text-transparent">K</span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight">KOLLAB</h1>
        <p className="mt-3 text-muted-foreground text-lg">Gestión del Trabajo Remoto e Híbrido</p>
        <div className="mt-6 flex justify-center"><div className="h-1 w-24 rounded-full shimmer" /></div>
      </div>
    </div>
  );
}

/* ============================ LOGIN ============================
   Formulario de inicio de sesión. Valida con signInLocal (auth.ts) y,
   si las credenciales son correctas, entrega el usuario autenticado al
   componente padre (KollabApp) mediante onLogin. */
function LoginScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Rellena las credenciales del rol elegido (acceso rápido para la demo),
  // así no hay que escribir el correo y la clave a mano frente al profesor.
  const fillRole = (role: Role) => {
    const c = DEMO_CREDENTIALS[role];
    if (c) { setEmail(c.email); setPassword(c.password); setError(""); }
  };

  // Maneja el envío del formulario: primero una validación mínima del
  // formato (que el correo tenga "@" y la clave no esté vacía), y luego
  // intenta el login local contra las 3 cuentas demo de auth.ts.
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.includes("@") || password.length < 4) { setError("Verifica tu correo y contraseña."); return; }
    const user = signInLocal(email, password);
    if (!user) { setError("Credenciales inválidas."); return; }
    onLogin(user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 anim-fade-up">
      <div className="w-full max-w-md glass-strong rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#26A69A,#00BCD4)" }}>
            <span className="text-2xl font-extrabold text-[#04222a]">K</span>
          </div>
          <div>
            <div className="text-xl font-bold">KOLLAB</div>
            <div className="text-xs text-muted-foreground">Inicia sesión para continuar</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Correo electrónico">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-[var(--input)] rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--ring)] border border-white/5" />
          </Field>
          <Field label="Contraseña">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-[var(--input)] rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--ring)] border border-white/5" />
          </Field>

          {/* Botones de acceso rápido: uno por rol, solo para la demo */}
          <Field label="Acceso rápido (rellena las credenciales)">
            <div className="grid grid-cols-3 gap-2">
              {USERS.map(u => (
                <button type="button" key={u.id} onClick={() => fillRole(u.role)}
                  className="rounded-lg px-2 py-2 text-xs border border-white/10 bg-white/5 hover:bg-white/10 transition">
                  <div className="font-semibold">{u.name.split(" ")[0]}</div>
                  <div className="text-[10px] capitalize text-muted-foreground">{u.role}</div>
                </button>
              ))}
            </div>
          </Field>

          {error && <div className="text-sm text-[var(--color-danger)]">{error}</div>}

          <button type="submit" className="btn-primary w-full rounded-lg py-2.5">Ingresar</button>
        </form>
        <p className="mt-4 text-[11px] text-muted-foreground text-center">
          Inicia sesión con tu cuenta. Tu rol define lo que puedes ver y hacer.
        </p>
      </div>
    </div>
  );
}

// Envoltorio reutilizable para cualquier campo de formulario: muestra
// una etiqueta pequeña arriba y, debajo, el input que se le pase como
// hijo (children). Evita repetir el mismo <label> en cada campo.
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

/* ============================ MAIN APP ============================
   Pantalla principal una vez autenticado: header con pestañas + el
   contenido de la pestaña activa + los modales (detalle de proyecto,
   nuevo proyecto) cuando corresponde. Aquí vive el estado global de
   la sesión: proyectos, auditoría e integraciones, todos persistidos
   en localStorage mediante usePersistentState. */
type Tab = "dashboard" | "proyectos" | "carga" | "integraciones" | "auditoria";

function MainApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  // Cada uno de estos 3 estados se guarda automáticamente en localStorage
  // bajo su propia clave ("projects", "audit", "integrations"), así los
  // cambios del usuario sobreviven a recargar la página.
  const [projects, setProjects] = usePersistentState<Project[]>("projects", INITIAL_PROJECTS);
  const [audit, setAudit] = usePersistentState<AuditEntry[]>("audit", INITIAL_AUDIT);
  const [integrations, setIntegrations] = usePersistentState<Integration[]>("integrations", INITIAL_INTEGRATIONS);
  const [detailId, setDetailId] = useState<string | null>(null); // id del proyecto abierto en el modal de detalle
  const [showNewProject, setShowNewProject] = useState(false);

  // Banderas de permisos derivadas del rol (control de acceso por rol, RBAC).
  // Se calculan una sola vez aquí y se pasan hacia abajo como props, en vez
  // de repetir la comparación "user.role === ..." en cada componente hijo.
  const isAdmin = user.role === "admin";
  const isManagerUp = user.role === "admin" || user.role === "gerente";

  // Definición de las pestañas de navegación. "show" controla la
  // visibilidad según el rol: por ejemplo, "Auditoría" solo aparece
  // para admin/gerente, nunca para colaborador.
  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard; show: boolean }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { id: "proyectos", label: "Proyectos", icon: FolderKanban, show: true },
    { id: "carga", label: "Carga del equipo", icon: Users2, show: true },
    { id: "integraciones", label: "Integraciones", icon: Plug, show: true },
    { id: "auditoria", label: "Auditoría", icon: ScrollText, show: isManagerUp },
  ];

  // Agrega una entrada nueva al inicio del historial de auditoría.
  // La reciben como prop todos los componentes que ejecutan una acción
  // que debe quedar registrada (completar tarea, comentar, conectar
  // una integración, etc.) — así la bitácora queda centralizada aquí.
  const addAudit = (action: string, detail: string) => {
    const entry: AuditEntry = {
      id: "a" + Date.now(), date: new Date().toISOString().slice(0, 16).replace("T", " "),
      action, user: user.name, detail,
    };
    setAudit(p => [entry, ...p]);
  };

  // Proyecto actualmente abierto en el modal de detalle (o null si no hay
  // ninguno abierto). Se busca cada vez por id en vez de guardar el
  // objeto completo, para que el modal siempre vea la versión más
  // actualizada del proyecto aunque cambie mientras está abierto.
  const detail = projects.find(p => p.id === detailId) || null;

  return (
    <div className="min-h-screen">
      {/* Barra superior fija: logo, datos del usuario y botón de salir */}
      <header className="sticky top-0 z-30 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#26A69A,#00BCD4)" }}>
              <span className="text-lg font-extrabold text-[#04222a]">K</span>
            </div>
            <div>
              <div className="font-bold leading-tight">KOLLAB</div>
              <div className="text-[10px] text-muted-foreground leading-tight hidden sm:block">Trabajo remoto e híbrido</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Tarjeta con avatar, nombre y rol del usuario conectado */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: user.color, color: "#04222a" }}>{user.initials}</div>
              <div className="text-sm">
                <div className="leading-tight">{user.name}</div>
                <div className="text-[10px] text-muted-foreground capitalize leading-tight">{user.role}</div>
              </div>
            </div>
            <button onClick={onLogout} className="btn-ghost rounded-lg px-3 py-2 text-sm flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>

        {/* Navegación por pestañas, filtrando las que el rol no debe ver */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 pb-2 flex gap-1 overflow-x-auto">
          {tabs.filter(t => t.show).map(t => {
            const Icon = t.icon; const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition ${active
                  ? "bg-gradient-to-br from-[rgba(38,166,154,0.25)] to-[rgba(0,188,212,0.20)] text-white border border-[rgba(38,166,154,0.5)]"
                  : "text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent"}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Contenido de la pestaña activa. La key={tab} fuerza a React a
          re-montar el bloque al cambiar de pestaña, lo que reinicia la
          animación de entrada (anim-fade-up) cada vez. */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div key={tab} className="anim-fade-up">
          {tab === "dashboard" && <DashboardView projects={projects} onOpen={setDetailId} />}
          {tab === "proyectos" && (
            <ProjectsView projects={projects} onOpen={setDetailId}
              canCreate={isManagerUp} onNew={() => setShowNewProject(true)} />
          )}
          {tab === "carga" && <WorkloadView />}
          {tab === "integraciones" && (
            <IntegrationsView integrations={integrations} setIntegrations={setIntegrations}
              isAdmin={isAdmin} addAudit={addAudit} />
          )}
          {tab === "auditoria" && isManagerUp && <AuditView entries={audit} />}
        </div>
      </main>

      {/* Modal de detalle de proyecto: solo se renderiza si hay un
          proyecto seleccionado (detail no es null) */}
      {detail && (
        <ProjectDetailModal project={detail} user={user}
          onClose={() => setDetailId(null)}
          onUpdate={(updated) => {
            // Reemplaza, dentro del arreglo de proyectos, solo el proyecto
            // que cambió (comparando por id), dejando los demás intactos.
            setProjects(p => p.map(x => x.id === updated.id ? updated : x));
          }}
          addAudit={addAudit} />
      )}

      {/* Modal de creación de proyecto: solo accesible para admin/gerente */}
      {showNewProject && isManagerUp && (
        <NewProjectModal onClose={() => setShowNewProject(false)}
          onCreate={(np) => {
            setProjects(p => [np, ...p]);
            addAudit("Creación de proyecto", `Se creó el proyecto «${np.name}».`);
            setShowNewProject(false);
          }} />
      )}
    </div>
  );
}

/* ============================ DASHBOARD ============================
   Pantalla de inicio con los KPIs generales (RF-03) y la cuadrícula de
   proyectos activos. */

// Calcula el porcentaje de avance de un proyecto a partir de cuántas de
// sus tareas están marcadas como completadas. Se usa tanto en las
// tarjetas de proyecto como en el cálculo del promedio del dashboard.
function progressOf(p: Project) {
  if (p.tasks.length === 0) return 0;
  return Math.round((p.tasks.filter(t => t.done).length / p.tasks.length) * 100);
}

function DashboardView({ projects, onOpen }: { projects: Project[]; onOpen: (id: string) => void }) {
  const active = projects.filter(p => p.status !== "Completado");
  const avg = Math.round(projects.reduce((s, p) => s + progressOf(p), 0) / projects.length);
  const atRisk = projects.filter(p => p.status === "En riesgo").length;
  const pending = projects.reduce((s, p) => s + p.tasks.filter(t => !t.done).length, 0);

  return (
    <div className="space-y-6">
      <SectionTitle title="Resumen General" subtitle="Indicadores clave de tus proyectos y equipos." />
      {/* Las 4 tarjetas de KPI (RF-03): proyectos activos, avance
          promedio, proyectos en riesgo y tareas pendientes en total */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={FolderKanban} label="Proyectos activos" value={active.length} color="#00BCD4" />
        <KpiCard icon={TrendingUp} label="Avance global promedio" value={`${avg}%`} color="#26A69A" />
        <KpiCard icon={AlertTriangle} label="En riesgo / atraso" value={atRisk} color="#FFB300" />
        <KpiCard icon={Clock} label="Tareas pendientes" value={pending} color="#1E88E5" />
      </div>

      <SectionTitle title="Proyectos Activos" subtitle="Haz clic en una tarjeta para ver el detalle." />
      <ProjectGrid projects={active} onOpen={onOpen} />
    </div>
  );
}

// Tarjeta individual de KPI: ícono + etiqueta + valor grande. El color
// se usa tanto en el ícono como en su fondo (con transparencia "22").
function KpiCard({ icon: Icon, label, value, color }: { icon: typeof FolderKanban; label: string; value: ReactNode; color: string }) {
  return (
    <div className="glass rounded-2xl p-4 hover:translate-y-[-2px] transition">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}22`, color }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-extrabold">{value}</div>
    </div>
  );
}

// Encabezado reutilizable de sección: título + subtítulo opcional.
// Se usa al inicio de cada vista (Dashboard, Proyectos, Carga, etc.)
// para mantener la misma jerarquía visual en toda la app.
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

/* ============================ PROJECTS ============================
   Vista de listado completo de proyectos (RF-01), con botón de "Nuevo
   proyecto" visible solo para admin/gerente. */
function ProjectsView({ projects, onOpen, canCreate, onNew }: {
  projects: Project[]; onOpen: (id: string) => void; canCreate: boolean; onNew: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SectionTitle title="Proyectos" subtitle="Gestiona todos tus proyectos activos y completados." />
        {canCreate && (
          <button onClick={onNew} className="btn-primary rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo proyecto
          </button>
        )}
      </div>
      <ProjectGrid projects={projects} onOpen={onOpen} />
    </div>
  );
}

// Cuadrícula responsiva de tarjetas de proyecto: 1 columna en móvil,
// 2 en pantallas medianas, 3 en pantallas grandes.
function ProjectGrid({ projects, onOpen }: { projects: Project[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.map(p => <ProjectCard key={p.id} project={p} onOpen={() => onOpen(p.id)} />)}
    </div>
  );
}

// Tarjeta de un proyecto: nombre, fecha de entrega, estado, descripción
// y una barra de progreso calculada con progressOf(). Al hacer clic en
// cualquier parte de la tarjeta, se abre el modal de detalle.
function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const done = project.tasks.filter(t => t.done).length;
  const prog = progressOf(project);
  return (
    <button onClick={onOpen}
      className="glass rounded-2xl p-5 text-left hover:translate-y-[-2px] hover:shadow-xl transition group">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-lg leading-snug group-hover:text-[var(--color-primary)] transition">{project.name}</div>
          <div className="text-xs text-muted-foreground mt-1">Entrega: {formatDate(project.dueDate)}</div>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{project.description}</p>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Avance</span><span className="font-semibold">{prog}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${prog}%`, background: "linear-gradient(90deg,#26A69A,#00BCD4)" }} />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{done}/{project.tasks.length} tareas completadas</div>
      </div>
    </button>
  );
}

// Etiqueta de color según el estado del proyecto (en curso / en riesgo /
// completado). El objeto "map" centraliza los colores para que sea fácil
// ajustar la paleta sin tocar el resto del componente.
function StatusBadge({ status }: { status: ProjectStatus }) {
  const map: Record<ProjectStatus, { bg: string; fg: string }> = {
    "En curso": { bg: "rgba(30,136,229,0.18)", fg: "#7ab8f5" },
    "En riesgo": { bg: "rgba(255,179,0,0.18)", fg: "#ffd166" },
    "Completado": { bg: "rgba(67,160,71,0.18)", fg: "#7fd183" },
  };
  const s = map[status];
  return <span className="text-[11px] px-2 py-1 rounded-full font-semibold whitespace-nowrap"
    style={{ background: s.bg, color: s.fg }}>{status}</span>;
}

// Misma idea que StatusBadge, pero para la prioridad de una tarea
// (alta / media / baja), con su propia paleta de colores.
function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, { bg: string; fg: string }> = {
    "Alta": { bg: "rgba(229,57,53,0.18)", fg: "#ff8d8a" },
    "Media": { bg: "rgba(255,179,0,0.18)", fg: "#ffd166" },
    "Baja": { bg: "rgba(38,166,154,0.18)", fg: "#7fe0d4" },
  };
  const s = map[priority];
  return <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
    style={{ background: s.bg, color: s.fg }}>{priority}</span>;
}

// Convierte una fecha en formato ISO ("2026-07-15") al formato chileno
// de lectura habitual ("15/07/2026").
function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* ============================ WORKLOAD ============================
   Vista de monitoreo de carga laboral por persona (RF-02). Usa el
   arreglo fijo WORKLOAD definido más arriba (no es editable desde la
   interfaz en esta versión del MVP). */
function WorkloadView() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Monitoreo de Carga Laboral" subtitle="Visualiza la distribución del trabajo en tu equipo." />
      <div className="grid md:grid-cols-2 gap-4">
        {WORKLOAD.map(w => {
          // El color y la alerta de "sobrecargado" dependen de qué tan
          // alto es el porcentaje de carga de cada persona.
          const color = w.load >= 80 ? "#E53935" : w.load >= 60 ? "#FFB300" : "#43A047";
          const overloaded = w.load >= 80;
          return (
            <div key={w.name} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
                    {w.name.split(" ").map(x => x[0]).slice(0,2).join("")}
                  </div>
                  <div>
                    <div className="font-semibold">{w.name}</div>
                    <div className="text-xs text-muted-foreground">{w.pending} tareas pendientes · {w.total} asignadas en total</div>
                  </div>
                </div>
                {overloaded && (
                  <span className="text-[11px] px-2 py-1 rounded-full font-semibold"
                    style={{ background: "rgba(229,57,53,0.18)", color: "#ff8d8a" }}>⚠ Sobrecargado</span>
                )}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Carga laboral</span>
                  <span className="font-semibold" style={{ color }}>{w.load}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${w.load}%`, background: color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ INTEGRATIONS ============================
   Vista de integraciones (RF-05). Conectar/desconectar es solo visual:
   simula un retraso de red con setTimeout y, al "conectar", muestra una
   vista previa con datos de ejemplo (INTEGRATION_PREVIEW) de lo que esa
   herramienta mostraría si estuviera realmente integrada. */
function IntegrationsView({ integrations, setIntegrations, isAdmin, addAudit }: {
  integrations: Integration[]; setIntegrations: React.Dispatch<React.SetStateAction<Integration[]>>;
  isAdmin: boolean; addAudit: (a: string, d: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null); // integración con la vista previa abierta
  const connected = integrations.filter(i => i.connected).length;

  // Conecta o desconecta una integración por id.
  // - Si ya estaba conectada: la desconecta de inmediato y registra el
  //   evento en la auditoría.
  // - Si no estaba conectada: marca "syncing" (muestra "Sincronizando…"),
  //   espera 1.2 segundos para simular la conexión real con el proveedor,
  //   y luego la marca como conectada, actualiza la fecha de sincronización
  //   y abre automáticamente su vista previa.
  const toggle = (id: string) => {
    const integ = integrations.find(i => i.id === id)!;
    if (integ.connected) {
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, connected: false, lastSync: null } : i));
      addAudit("Integración desconectada", `Se desconectó la integración con ${integ.name}.`);
      if (expandedId === id) setExpandedId(null);
    } else {
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, syncing: true } : i));
      setTimeout(() => {
        setIntegrations(prev => prev.map(i => i.id === id
          ? { ...i, connected: true, syncing: false, lastSync: new Date().toISOString().slice(0, 16).replace("T", " ") }
          : i));
        addAudit("Integración conectada", `Conexión establecida con ${integ.name}.`);
        setExpandedId(id);
      }, 1200);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SectionTitle title="Integración con Herramientas" subtitle="Conecta Kollab con las plataformas que ya usa tu equipo." />
        {/* Contador "X de Y conectadas" en la esquina superior derecha */}
        <div className="glass rounded-full px-4 py-2 text-sm">
          <span className="text-muted-foreground">Conectadas:</span>{" "}
          <span className="font-bold text-[var(--color-primary)]">{connected} de {integrations.length}</span>
        </div>
      </div>

      <div className="space-y-3">
        {integrations.map(i => (
          <div key={i.id} className="glass rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-2xl">{i.icon}</div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {i.name}
                    {/* Punto verde/gris que indica el estado de conexión a simple vista */}
                    <span className={`w-2 h-2 rounded-full ${i.connected ? "bg-[var(--color-success)]" : "bg-white/30"}`} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {i.syncing ? "Sincronizando…"
                      : i.connected ? `Última sincronización: ${i.lastSync}`
                      : "Sin conexión activa"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Cualquier usuario puede mostrar/ocultar la vista previa
                    si la integración ya está conectada */}
                {i.connected && !i.syncing && (
                  <button onClick={() => setExpandedId(expandedId === i.id ? null : i.id)}
                    className="btn-ghost rounded-lg px-3 py-2 text-xs">
                    {expandedId === i.id ? "Ocultar vista previa" : "Ver vista previa"}
                  </button>
                )}
                {/* Solo admin puede conectar/desconectar (RBAC) */}
                {isAdmin && (
                  <button onClick={() => toggle(i.id)} disabled={i.syncing}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${i.connected
                      ? "btn-danger" : "btn-primary"} ${i.syncing ? "opacity-60 cursor-wait" : ""}`}>
                    {i.syncing ? "Sincronizando…" : i.connected ? "Desconectar" : "Conectar"}
                  </button>
                )}
              </div>
            </div>
            {/* Panel de vista previa: solo se muestra si está conectada,
                expandida, y no en proceso de sincronización */}
            {i.connected && expandedId === i.id && !i.syncing && (
              <div className="px-4 pb-4 anim-fade-up">
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[var(--color-primary)]" /> {INTEGRATION_PREVIEW[i.id].title}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                      Vista previa · datos de ejemplo
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {INTEGRATION_PREVIEW[i.id].items.map((it, idx) => (
                      <li key={idx} className="text-muted-foreground">• {it}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ AUDIT ============================
   Bitácora de auditoría (RF-04 / RNF-03). Solo recibe las entradas ya
   filtradas/visibles: la decisión de quién puede ver esta pestaña se
   toma en MainApp (isManagerUp), no aquí. */
function AuditView({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="space-y-6">
      <SectionTitle title="Bitácora de Auditoría" subtitle="Historial de acciones registradas en la plataforma." />
      <div className="glass rounded-2xl divide-y divide-white/5 overflow-hidden">
        {entries.map(e => (
          <div key={e.id} className="p-4 flex items-start gap-4 hover:bg-white/[0.03] transition">
            <div className="w-2 h-2 mt-2 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{e.action}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{e.user}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">{e.detail}</div>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">{e.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ PROJECT DETAIL MODAL ============================
   Modal con el detalle completo de un proyecto: lista de tareas (con
   opción de completarlas o eliminarlas), formulario para agregar una
   tarea nueva, y el panel de comentarios (comunicación trazable, RF-04). */
function ProjectDetailModal({ project, user, onClose, onUpdate, addAudit }: {
  project: Project; user: User; onClose: () => void;
  onUpdate: (p: Project) => void; addAudit: (a: string, d: string) => void;
}) {
  const isManagerUp = user.role === "admin" || user.role === "gerente";
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState(user.name);
  const [newPriority, setNewPriority] = useState<Priority>("Media");
  const [message, setMessage] = useState("");

  // Marca una tarea como completada/pendiente (toggle) y, solo si pasó
  // de pendiente a completada, registra el evento en la auditoría.
  const toggleTask = (id: string) => {
    const t = project.tasks.find(x => x.id === id)!;
    const updated: Project = { ...project, tasks: project.tasks.map(x => x.id === id ? { ...x, done: !x.done } : x) };
    onUpdate(updated);
    if (!t.done) addAudit("Tarea completada", `Se completó la tarea «${t.title}» en ${project.name}.`);
  };

  // Elimina una tarea del proyecto (solo accesible para admin/gerente,
  // según el botón que la llama más abajo) y deja registro en auditoría.
  const deleteTask = (id: string) => {
    const t = project.tasks.find(x => x.id === id)!;
    onUpdate({ ...project, tasks: project.tasks.filter(x => x.id !== id) });
    addAudit("Tarea eliminada", `Se eliminó la tarea «${t.title}» en ${project.name}.`);
  };

  // Crea una tarea nueva. El responsable solo se puede elegir libremente
  // si el usuario es admin/gerente; un colaborador siempre queda como
  // responsable de las tareas que él mismo crea (RBAC).
  const addTask = () => {
    if (!newTitle.trim()) return;
    const t: Task = {
      id: "t" + Date.now(), title: newTitle.trim(),
      assignee: isManagerUp ? newAssignee : user.name,
      priority: newPriority, done: false,
    };
    onUpdate({ ...project, tasks: [...project.tasks, t] });
    addAudit("Creación de tarea", `Se creó la tarea «${t.title}» en ${project.name}.`);
    setNewTitle(""); setNewPriority("Media");
  };

  // Publica un comentario nuevo en el proyecto (comunicación trazable).
  const sendMessage = () => {
    if (!message.trim()) return;
    const c: Comment = {
      id: "c" + Date.now(), author: user.name,
      date: new Date().toISOString().slice(0, 16).replace("T", " "),
      message: message.trim(),
    };
    onUpdate({ ...project, comments: [...project.comments, c] });
    addAudit("Comentario publicado", `Nuevo comentario en ${project.name}.`);
    setMessage("");
  };

  return (
    <ModalShell onClose={onClose} title="Detalle del Proyecto" subtitle={project.name}>
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Columna izquierda (más ancha): lista de tareas + formulario para agregar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Tareas</h3>
            <StatusBadge status={project.status} />
          </div>
          <div className="space-y-2">
            {project.tasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                {/* Checkbox personalizado para marcar la tarea como completada */}
                <button onClick={() => toggleTask(t.id)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition flex-shrink-0 ${t.done
                    ? "bg-[var(--color-success)] border-[var(--color-success)]"
                    : "border-white/30 hover:border-white/60"}`}>
                  {t.done && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                  <div className="text-xs text-muted-foreground">Responsable: {t.assignee}</div>
                </div>
                <PriorityBadge priority={t.priority} />
                {/* Solo admin/gerente pueden eliminar tareas (RBAC) */}
                {isManagerUp && (
                  <button onClick={() => deleteTask(t.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-[var(--color-danger)] hover:bg-white/5 transition"
                    aria-label="Eliminar tarea">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {project.tasks.length === 0 && (
              <div className="text-sm text-muted-foreground italic">Aún no hay tareas en este proyecto.</div>
            )}
          </div>

          {/* Formulario rápido para agregar una tarea nueva al proyecto */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
            <div className="text-xs text-muted-foreground">Agregar nueva tarea</div>
            <div className="grid sm:grid-cols-12 gap-2">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Título de la tarea"
                className="sm:col-span-5 bg-[var(--input)] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)] border border-white/5" />
              {/* Selector de responsable: solo editable por admin/gerente.
                  Un colaborador ve su propio nombre fijo, sin poder
                  reasignar la tarea a otra persona. */}
              {isManagerUp ? (
                <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)}
                  className="sm:col-span-3 bg-[var(--input)] rounded-lg px-3 py-2 text-sm outline-none border border-white/5">
                  {TEAM.map(n => <option key={n} value={n} className="bg-[#0D1B2A]">{n}</option>)}
                </select>
              ) : (
                <div className="sm:col-span-3 text-xs text-muted-foreground self-center px-3 py-2">
                  Responsable: {user.name}
                </div>
              )}
              <select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)}
                className="sm:col-span-2 bg-[var(--input)] rounded-lg px-3 py-2 text-sm outline-none border border-white/5">
                <option className="bg-[#0D1B2A]">Alta</option>
                <option className="bg-[#0D1B2A]">Media</option>
                <option className="bg-[#0D1B2A]">Baja</option>
              </select>
              <button onClick={addTask} className="sm:col-span-2 btn-primary rounded-lg px-3 py-2 text-sm">Agregar</button>
            </div>
          </div>
        </div>

        {/* Columna derecha: hilo de comentarios del proyecto */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comunicación del proyecto</h3>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 max-h-72 overflow-y-auto space-y-3">
            {project.comments.map(c => (
              <div key={c.id} className="text-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-white">{c.author}</span>
                  <span>·</span><span>{c.date}</span>
                </div>
                <div className="mt-1">{c.message}</div>
              </div>
            ))}
            {project.comments.length === 0 && (
              <div className="text-sm text-muted-foreground italic">Aún no hay mensajes. ¡Inicia la conversación!</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input value={message} onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Escribe un mensaje…"
              className="flex-1 bg-[var(--input)] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)] border border-white/5" />
            <button onClick={sendMessage} className="btn-primary rounded-lg px-3 py-2 text-sm flex items-center gap-1.5">
              <Send className="w-4 h-4" /> Enviar
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

/* ============================ NEW PROJECT MODAL ============================
   Formulario para crear un proyecto nuevo (solo accesible a admin/gerente
   desde el botón de ProjectsView). El proyecto nace siempre con estado
   "En curso" y sin tareas ni comentarios. */
function NewProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Project) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");

  // Valida que al menos el nombre y la fecha límite estén presentes
  // antes de crear el proyecto; la descripción es opcional.
  const submit = () => {
    if (!name.trim() || !dueDate) { setError("Completa el nombre y la fecha límite."); return; }
    onCreate({
      id: "p" + Date.now(), name: name.trim(),
      description: description.trim() || "Sin descripción.",
      status: "En curso", dueDate, tasks: [], comments: [],
    });
  };

  return (
    <ModalShell onClose={onClose} title="Nuevo proyecto" subtitle="Define los datos básicos para crear un proyecto.">
      <div className="space-y-3">
        <Field label="Nombre">
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full bg-[var(--input)] rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--ring)] border border-white/5" />
        </Field>
        <Field label="Descripción">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full bg-[var(--input)] rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--ring)] border border-white/5 resize-none" />
        </Field>
        <Field label="Fecha límite">
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full bg-[var(--input)] rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--ring)] border border-white/5" />
        </Field>
        {error && <div className="text-sm text-[var(--color-danger)]">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost rounded-lg px-4 py-2 text-sm">Cancelar</button>
          <button onClick={submit} className="btn-primary rounded-lg px-4 py-2 text-sm">Crear</button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ============================ MODAL SHELL ============================
   Estructura común de cualquier modal de la app: fondo oscurecido con
   blur, tarjeta centrada con título/subtítulo y botón de cierre, y
   cierre al presionar Escape o al hacer clic fuera de la tarjeta. */
function ModalShell({ onClose, title, subtitle, children }: {
  onClose: () => void; title: string; subtitle?: string; children: ReactNode;
}) {
  // Mientras el modal está abierto: escucha la tecla Escape para
  // cerrarlo, y bloquea el scroll del fondo (body) para que la página
  // no se desplace detrás del modal. Ambos efectos se deshacen al
  // desmontar el componente (cuando el modal se cierra).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-up"
      style={{ background: "rgba(5,12,18,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}> {/* clic en el fondo oscuro cierra el modal */}
      <div onClick={e => e.stopPropagation()} /* evita que el clic dentro de la tarjeta también cierre el modal */
        className="anim-scale-in glass-strong rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-ghost rounded-lg p-2" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
