"use strict";
/* =====================================================================
   Kollab — Cliente frontend conectado a Supabase
   Auth real (signInWithPassword) + consultas a PostgreSQL con RLS (RBAC)
   ===================================================================== */

const cfg = window.KOLLAB_CONFIG || {};
let sb = null;
let me = null;        // { id, name, role }
let users = [];

// Validar configuración
if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("TU-PROYECTO") || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("TU-ANON")) {
  document.getElementById("config-warning").classList.remove("hidden");
} else {
  sb = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  init();
}

function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,c=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c])); }
/* ---------- HELPERS DE ROL (RBAC) ---------- */
function isManager(){ return me && ["admin","gerente"].includes(me.role); }  // admin o gerente
function isAdmin(){ return me && me.role === "admin"; }
/* Traduce errores crudos (incl. los de RLS) a mensajes claros para el usuario */
function friendlyError(e){
  const m = (e && e.message) ? e.message : String(e);
  if (/row-level security|violates row-level|permission denied/i.test(m))
    return "No tienes permisos para realizar esta acción con tu rol actual.";
  return m;
}
async function audit(action, detail){
  try { await sb.from("audit_log").insert({ user_id: me.id, action, detail }); } catch(e){ console.warn("audit", e.message); }
}

/* ---------- INIT / SESIÓN ---------- */
async function init(){
  const { data } = await sb.auth.getSession();
  if (data.session) { await afterLogin(); }
  else document.getElementById("login-screen").classList.remove("hidden");
}

async function doLogin(){
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-pass").value;
  const err = document.getElementById("login-error"); err.textContent = "";
  const btn = document.getElementById("btn-login"); btn.disabled = true; btn.textContent = "Ingresando...";
  try {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await afterLogin();
  } catch(e){ err.textContent = e.message || "No se pudo iniciar sesión"; }
  finally { btn.disabled = false; btn.textContent = "Ingresar"; }
}

async function afterLogin(){
  const { data: { user } } = await sb.auth.getUser();
  // cargar perfil (rol) desde la tabla profiles
  const { data: prof } = await sb.from("profiles").select("id,name,role").eq("id", user.id).single();
  me = prof || { id: user.id, name: user.email, role: "colaborador" };

  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("user-chip").textContent = `${me.name} · ${me.role}`;

  // Capa 2 (UX): ocultar en la interfaz lo que el rol no puede hacer.
  // La seguridad REAL la impone la base de datos (RLS); esto solo evita mostrar botones inútiles.
  document.getElementById("btn-new-project").style.display = isManager() ? "" : "none";
  document.querySelector('[data-view="audit"]').style.display = isManager() ? "" : "none";

  const { data: us } = await sb.from("profiles").select("id,name").order("name");
  users = us || [];
  await audit("LOGIN", `${me.name} inició sesión`);
  loadDashboard();
}

async function logout(){
  await sb.auth.signOut();
  location.reload();
}

/* ---------- TABS ---------- */
function switchTab(view){
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.dataset.view===view));
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById("view-"+view).classList.add("active");
  if(view==="dashboard") loadDashboard();
  if(view==="projects") loadProjects();
  if(view==="workload") loadWorkload();
  if(view==="integrations") loadIntegrations();
  if(view==="audit") loadAudit();
}

/* ---------- LÓGICA / RENDER ---------- */
function progColor(p){ return p===100?"var(--green)":p>=50?"var(--teal)":p>=25?"var(--amber)":"var(--red)"; }
function statusLabel(s){ return {curso:"En curso",riesgo:"En riesgo",completado:"Completado",atrasado:"Atrasado"}[s]||s; }

function computeProject(p, tasks){
  const t = tasks.filter(x=>x.project_id===p.id);
  const done = t.filter(x=>x.done).length;
  const progress = t.length ? Math.round(done/t.length*100) : 0;
  let status = p.status;
  if (progress===100) status="completado";
  else if (p.deadline && new Date(p.deadline) < new Date(new Date().toDateString())) status="atrasado";
  return { ...p, taskCount:t.length, doneCount:done, progress, computedStatus:status };
}

async function fetchProjectsWithTasks(){
  const [{ data: projects }, { data: tasks }] = await Promise.all([
    sb.from("projects").select("*").order("created_at",{ascending:false}),
    sb.from("tasks").select("id,project_id,done")
  ]);
  return (projects||[]).map(p=>computeProject(p, tasks||[]));
}

async function loadDashboard(){
  const projects = await fetchProjectsWithTasks();
  const total = projects.length;
  const atRisk = projects.filter(p=>["riesgo","atrasado"].includes(p.computedStatus)).length;
  const { data: allTasks } = await sb.from("tasks").select("done");
  const pending = (allTasks||[]).filter(t=>!t.done).length;
  const globalProg = total ? Math.round(projects.reduce((a,p)=>a+p.progress,0)/total) : 0;
  document.getElementById("kpis").innerHTML = `
    <div class="kpi"><div class="val">${total}</div><div class="lbl">Proyectos activos</div></div>
    <div class="kpi ok"><div class="val">${globalProg}%</div><div class="lbl">Avance global promedio</div></div>
    <div class="kpi danger"><div class="val">${atRisk}</div><div class="lbl">En riesgo / atraso</div></div>
    <div class="kpi warn"><div class="val">${pending}</div><div class="lbl">Tareas pendientes</div></div>`;
  renderCards(projects, "dash-projects");
}
async function loadProjects(){ renderCards(await fetchProjectsWithTasks(), "all-projects"); }

function renderCards(projects, target){
  const el = document.getElementById(target);
  if(!projects.length){ el.innerHTML = `<div class="empty">No hay proyectos.</div>`; return; }
  el.innerHTML = projects.map(p=>`
    <div class="project-card" onclick="openDetail(${p.id})">
      <div class="pc-head">
        <div><h3>${esc(p.name)}</h3><div class="pc-meta">Entrega: ${p.deadline||"—"}</div></div>
        <span class="badge badge-${p.computedStatus}">${statusLabel(p.computedStatus)}</span>
      </div>
      <div class="progress-wrap">
        <div class="progress-label"><span>Avance</span><span>${p.progress}%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${p.progress}%;background:${progColor(p.progress)}"></div></div>
      </div>
      <div class="pc-meta">${p.doneCount}/${p.taskCount} tareas completadas</div>
    </div>`).join("");
}

/* ---------- DETALLE DE PROYECTO ---------- */
let currentProject = null;
async function openDetail(id){
  const { data: p } = await sb.from("projects").select("*").eq("id",id).single();
  const { data: tasks } = await sb.from("tasks")
    .select("*, profiles(name)").eq("project_id",id).order("created_at");
  currentProject = { ...p, tasks: (tasks||[]).map(t=>({ ...t, assignee_name: t.profiles ? t.profiles.name : null })) };
  document.getElementById("dm-title").textContent = p.name;
  renderDetailTasks();
  document.getElementById("dm-task-assignee").innerHTML =
    `<option value="">Sin asignar</option>` + users.map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join("");
  // El colaborador crea tareas pero no asigna responsable: la planificación es de admin/gerente
  document.getElementById("dm-task-assignee").style.display = isManager() ? "" : "none";
  await loadComments(id);
  document.getElementById("detail-modal").classList.add("open");
}
function renderDetailTasks(){
  const el = document.getElementById("dm-tasks");
  if(!currentProject.tasks.length){ el.innerHTML = `<div class="empty">Sin tareas aún.</div>`; return; }
  el.innerHTML = currentProject.tasks.map(t=>`
    <div class="task-row">
      <div class="task-check ${t.done?"done":""}" onclick="toggleTask(${t.id}, ${t.done})">${t.done?"✓":""}</div>
      <span class="task-title ${t.done?"done":""}">${esc(t.title)}</span>
      ${isManager()
        ? `<select class="task-assignee" onchange="reassignTask(${t.id}, this.value)" title="Asignar responsable">
             <option value="">Sin asignar</option>
             ${users.map(u=>`<option value="${u.id}" ${t.assignee_id===u.id?"selected":""}>${esc(u.name)}</option>`).join("")}
           </select>`
        : `<span class="task-assignee">${esc(t.assignee_name||"Sin asignar")}</span>`}
      <span class="prio prio-${t.priority}">${t.priority.toUpperCase()}</span>
      ${isManager() ? `<button class="btn btn-danger btn-sm" onclick="deleteTask(${t.id})" title="Borrar tarea">✕</button>` : ""}
    </div>`).join("");
}
async function addTask(){
  const title = document.getElementById("dm-task-title").value.trim();
  if(!title) return;
  const assignee_id = document.getElementById("dm-task-assignee").value || null;
  const priority = document.getElementById("dm-task-prio").value;
  const { error } = await sb.from("tasks").insert({ project_id: currentProject.id, title, assignee_id, priority });
  if(error){ alert(friendlyError(error)); return; }
  await audit("CREATE_TASK", `Tarea "${title}"`);
  document.getElementById("dm-task-title").value="";
  await openDetail(currentProject.id); loadDashboard();
}
function taskTitle(id){ const t = currentProject.tasks.find(x=>x.id===id); return t ? t.title : `#${id}`; }
function userName(id){ const u = users.find(x=>x.id===id); return u ? u.name : null; }
async function toggleTask(id, done){
  const { error } = await sb.from("tasks").update({ done: !done }).eq("id",id);
  if(error){ alert(friendlyError(error)); return; }
  await audit("UPDATE_TASK", `Tarea "${taskTitle(id)}" en "${currentProject.name}" ${!done?"completada":"reabierta"}`);
  await openDetail(currentProject.id); loadDashboard();
}
async function deleteTask(id){
  const title = taskTitle(id);
  const { error } = await sb.from("tasks").delete().eq("id",id);
  if(error){ alert(friendlyError(error)); return; }
  await audit("DELETE_TASK", `Tarea "${title}" eliminada de "${currentProject.name}"`);
  await openDetail(currentProject.id); loadDashboard();
}
async function reassignTask(id, assignee_id){
  const title = taskTitle(id);
  const { error } = await sb.from("tasks").update({ assignee_id: assignee_id || null }).eq("id",id);
  if(error){ alert(friendlyError(error)); return; }
  const person = userName(assignee_id);
  await audit("ASSIGN_TASK", person ? `Tarea "${title}" asignada a ${person}` : `Tarea "${title}" dejada sin asignar`);
  await openDetail(currentProject.id);
}
async function loadComments(id){
  const { data } = await sb.from("comments").select("*, profiles(name)").eq("project_id",id).order("created_at");
  const el = document.getElementById("dm-comments");
  el.innerHTML = (data&&data.length) ? data.map(x=>`
    <div class="comment"><span class="time">${new Date(x.created_at).toLocaleString()}</span>
    <span class="author">${esc(x.profiles?x.profiles.name:"")}</span>
    <div class="body">${esc(x.body)}</div></div>`).join("") : `<div class="empty">Sin mensajes.</div>`;
}
async function addComment(){
  const body = document.getElementById("dm-comment").value.trim();
  if(!body) return;
  const { error } = await sb.from("comments").insert({ project_id: currentProject.id, user_id: me.id, body });
  if(error){ alert(friendlyError(error)); return; }
  await audit("COMMENT", `Comentó en "${currentProject.name}"`);
  document.getElementById("dm-comment").value="";
  await loadComments(currentProject.id);
}

/* ---------- CARGA (RF-02) ---------- */
async function loadWorkload(){
  const weights = { alta:3, media:2, baja:1 };
  const { data: tasks } = await sb.from("tasks").select("assignee_id,priority,done,profiles(name)");
  const map = {};
  (tasks||[]).forEach(t=>{
    if(!t.assignee_id) return;
    const name = t.profiles ? t.profiles.name : t.assignee_id;
    if(!map[t.assignee_id]) map[t.assignee_id] = { name, total:0, pending:0, weight:0 };
    map[t.assignee_id].total++;
    if(!t.done){ map[t.assignee_id].pending++; map[t.assignee_id].weight += (weights[t.priority]||1); }
  });
  const arr = Object.values(map);
  const maxW = Math.max(1, ...arr.map(m=>m.weight));
  arr.forEach(m=>m.loadPct = Math.round(m.weight/maxW*100));
  arr.sort((a,b)=>b.loadPct-a.loadPct);
  const el = document.getElementById("workload-list");
  if(!arr.length){ el.innerHTML = `<div class="empty">Sin tareas asignadas.</div>`; return; }
  el.innerHTML = arr.map(m=>{
    let color="var(--green)";
    if(m.loadPct>=80)color="var(--red)"; else if(m.loadPct>=55)color="var(--amber)"; else if(m.loadPct>=30)color="var(--teal)";
    const flag = m.loadPct>=80?" · ⚠ Sobrecargado":"";
    return `<div class="workload-row">
      <div class="wl-head"><span class="wl-name">${esc(m.name)}</span><span class="wl-pct" style="color:${color}">${m.loadPct}% carga${flag}</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${m.loadPct}%;background:${color}"></div></div>
      <div class="wl-stats">${m.pending} tareas pendientes · ${m.total} asignadas en total</div></div>`;
  }).join("");
}

/* ---------- INTEGRACIONES (RF-05) ---------- */
const TOOL_ICONS = { "Slack":"💬", "Google Drive":"📁", "Zoom":"🎥", "Jira":"🧩", "Trello":"📋" };
function toolIcon(t){ return TOOL_ICONS[t] || "🔌"; }
// Vistas previas de ejemplo: qué HARÍA cada integración una vez conectada (datos simulados)
const TOOL_MOCKS = {
  "Slack": { desc: "Notificaciones enviadas automáticamente al canal #kollab-proyectos:", items: [
    "🔔 Diego Soto completó la tarea \"Escaneo de dependencias\"",
    "🔔 Nuevo proyecto creado: \"Rediseño App Móvil\"",
    "⚠️ Alerta: Diego Soto está sobrecargado (3 tareas de prioridad alta)" ] },
  "Google Drive": { desc: "Archivos vinculados a los proyectos:", items: [
    "📄 Propuesta_Comercial.pdf — Rediseño App Móvil",
    "📊 KPIs_Gerenciales_Q2.xlsx — Dashboard de KPIs",
    "🖼️ Wireframes_v3.fig — Rediseño App Móvil" ] },
  "Zoom": { desc: "Reuniones generadas para el equipo:", items: [
    "🎥 Daily Standup — hoy 09:00 · https://zoom.us/j/8821046",
    "🎥 Revisión de Sprint — viernes 15:00 · https://zoom.us/j/9134572" ] },
  "Jira": { desc: "Incidencias sincronizadas (bidireccional):", items: [
    "KOL-12 · Configurar RBAC y MFA · 🟡 En progreso",
    "KOL-13 · Migrar datos históricos · ⚪ Por hacer",
    "KOL-14 · Validar APIs de integración · 🟢 Hecho" ] },
  "Trello": { desc: "Tablero sincronizado: \"Kollab Board\":", items: [
    "📋 Por hacer (4) · En progreso (3) · Hecho (7)",
    "↔️ Última sincronización trajo 2 tarjetas nuevas" ] }
};
async function loadIntegrations(){
  const { data } = await sb.from("integrations").select("*").order("tool");
  const list = data || [];
  const connected = list.filter(i=>i.status==="conectado").length;
  const el = document.getElementById("integrations-list");
  el.innerHTML = `<div class="int-summary">${connected} de ${list.length} herramientas conectadas</div>` +
    list.map(i=>{
      const m = TOOL_MOCKS[i.tool];
      const preview = (i.status==="conectado" && m) ? `
        <div class="int-preview">
          <div class="int-preview-head">Vista previa · datos de ejemplo (simulación)</div>
          <div class="int-preview-desc">${esc(m.desc)}</div>
          <ul>${m.items.map(it=>`<li>${esc(it)}</li>`).join("")}</ul>
        </div>` : "";
      return `<div class="int-block">
        <div class="int-row" id="int-row-${i.id}">
          <div class="int-info">
            <span class="int-icon">${toolIcon(i.tool)}</span>
            <span class="dot ${i.status==="conectado"?"on":"off"}"></span>
            <div>
              <span class="int-name">${esc(i.tool)}</span>
              <div class="int-sync">${i.status==="conectado"?"Última sincronización: "+(i.last_sync?new Date(i.last_sync).toLocaleString():"—"):"No conectado"}</div>
            </div>
          </div>
          ${isAdmin()?`<button class="btn ${i.status==="conectado"?"btn-danger":"btn-primary"} btn-sm" onclick="toggleIntegration(${i.id}, '${i.status}', '${esc(i.tool)}')">${i.status==="conectado"?"Desconectar":"Conectar"}</button>`:""}
        </div>
        ${preview}
      </div>`;
    }).join("");
}
async function toggleIntegration(id, status, tool){
  const newStatus = status==="conectado" ? "desconectado" : "conectado";
  // Estado intermedio "Sincronizando…" solo al conectar (feedback visual)
  if(newStatus==="conectado"){
    const row = document.getElementById("int-row-"+id);
    if(row){
      const btn = row.querySelector("button");
      if(btn){ btn.disabled = true; btn.textContent = "Sincronizando…"; }
      const sync = row.querySelector(".int-sync");
      if(sync){ sync.textContent = "Sincronizando…"; sync.classList.add("syncing"); }
    }
    await new Promise(r=>setTimeout(r, 1200));
  }
  const { error } = await sb.from("integrations").update({
    status: newStatus, last_sync: newStatus==="conectado" ? new Date().toISOString() : null
  }).eq("id",id);
  if(error){ alert(friendlyError(error)); loadIntegrations(); return; }
  await audit("INTEGRATION", `${tool||("#"+id)} ${newStatus==="conectado"?"conectada":"desconectada"}`);
  loadIntegrations();
}

/* ---------- AUDITORÍA (RF-04) ---------- */
async function loadAudit(){
  const { data, error } = await sb.from("audit_log").select("*, profiles(name)").order("created_at",{ascending:false}).limit(100);
  const el = document.getElementById("audit-list");
  if(error){ el.innerHTML = `<div class="empty">${esc(error.message)}</div>`; return; }
  el.innerHTML = (data&&data.length) ? data.map(a=>`
    <div class="audit-row"><span class="audit-time">${new Date(a.created_at).toLocaleString()}</span>
    <span class="audit-action">${esc(a.action)}</span>
    <span>${esc(a.profiles?a.profiles.name:"sistema")}: ${esc(a.detail||"")}</span></div>`).join("")
    : `<div class="empty">Sin registros.</div>`;
}

/* ---------- NUEVO PROYECTO ---------- */
function openProjectModal(){ ["pm-name","pm-desc","pm-deadline"].forEach(i=>document.getElementById(i).value=""); document.getElementById("project-modal").classList.add("open"); }
async function saveProject(){
  const name = document.getElementById("pm-name").value.trim();
  if(!name){ alert("Ingresa un nombre."); return; }
  const { error } = await sb.from("projects").insert({
    name, description: document.getElementById("pm-desc").value, deadline: document.getElementById("pm-deadline").value || null
  });
  if(error){ alert(friendlyError(error)); return; }
  await audit("CREATE_PROJECT", `Proyecto "${name}" creado`);
  closeModal("project-modal"); loadProjects(); loadDashboard();
}
function closeModal(id){ document.getElementById(id).classList.remove("open"); }
document.querySelectorAll(".modal-bg").forEach(bg=>bg.addEventListener("click",e=>{ if(e.target===bg) bg.classList.remove("open"); }));
const passInput = document.getElementById("login-pass");
if(passInput) passInput.addEventListener("keydown", e=>{ if(e.key==="Enter") doLogin(); });
