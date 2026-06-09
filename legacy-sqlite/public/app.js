"use strict";
/* Cliente del frontend — consume la API REST de Kollab */
const API = "";
let token = localStorage.getItem("kollab_token") || null;
let me = JSON.parse(localStorage.getItem("kollab_user") || "null");
let users = [];

function authHeaders() { return token ? { "Authorization": "Bearer " + token, "Content-Type": "application/json" } : { "Content-Type": "application/json" }; }
async function api(path, opts = {}) {
  const res = await fetch(API + path, { headers: authHeaders(), ...opts });
  if (res.status === 401) { logout(); throw new Error("Sesión expirada"); }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || ("Error " + res.status));
  return data;
}
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c])); }

/* ---------- AUTH ---------- */
async function doLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-pass").value;
  const err = document.getElementById("login-error");
  err.textContent = "";
  try {
    const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    token = data.token; me = data.user;
    localStorage.setItem("kollab_token", token);
    localStorage.setItem("kollab_user", JSON.stringify(me));
    enterApp();
  } catch (e) { err.textContent = e.message; }
}
function logout() {
  token = null; me = null;
  localStorage.removeItem("kollab_token"); localStorage.removeItem("kollab_user");
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
}
async function enterApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("user-chip").textContent = `${me.name} · ${me.role}`;
  // ocultar acciones no permitidas por rol (RBAC en UI)
  const canCreate = ["admin", "gerente"].includes(me.role);
  document.getElementById("btn-new-project").style.display = canCreate ? "" : "none";
  document.querySelector('[data-view="audit"]').style.display = canCreate ? "" : "none";
  try { users = await api("/api/users"); } catch {}
  loadDashboard();
}

/* ---------- TABS ---------- */
function switchTab(view) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById("view-" + view).classList.add("active");
  if (view === "dashboard") loadDashboard();
  if (view === "projects") loadProjects();
  if (view === "workload") loadWorkload();
  if (view === "integrations") loadIntegrations();
  if (view === "audit") loadAudit();
}

/* ---------- DASHBOARD ---------- */
function progColor(p){ return p===100?"var(--green)":p>=50?"var(--teal)":p>=25?"var(--amber)":"var(--red)"; }
function statusLabel(s){ return {curso:"En curso",riesgo:"En riesgo",completado:"Completado",atrasado:"Atrasado"}[s]||s; }

async function loadDashboard() {
  const k = await api("/api/kpis");
  document.getElementById("kpis").innerHTML = `
    <div class="kpi"><div class="val">${k.totalProjects}</div><div class="lbl">Proyectos activos</div></div>
    <div class="kpi ok"><div class="val">${k.globalProgress}%</div><div class="lbl">Avance global promedio</div></div>
    <div class="kpi danger"><div class="val">${k.atRiskProjects}</div><div class="lbl">En riesgo / atraso</div></div>
    <div class="kpi warn"><div class="val">${k.pendingTasks}</div><div class="lbl">Tareas pendientes</div></div>`;
  renderProjectCards(await api("/api/projects"), "dash-projects");
}
async function loadProjects() { renderProjectCards(await api("/api/projects"), "all-projects"); }

function renderProjectCards(projects, target) {
  const el = document.getElementById(target);
  if (!projects.length) { el.innerHTML = `<div class="empty">No hay proyectos.</div>`; return; }
  el.innerHTML = projects.map(p => `
    <div class="project-card" onclick="openDetail(${p.id})">
      <div class="pc-head">
        <div><h3>${esc(p.name)}</h3><div class="pc-meta">Entrega: ${p.deadline || "—"}</div></div>
        <span class="badge badge-${p.computedStatus}">${statusLabel(p.computedStatus)}</span>
      </div>
      <div class="progress-wrap">
        <div class="progress-label"><span>Avance</span><span>${p.progress}%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${p.progress}%;background:${progColor(p.progress)}"></div></div>
      </div>
      <div class="pc-meta">${p.doneCount}/${p.taskCount} tareas completadas</div>
    </div>`).join("");
}

/* ---------- PROJECT DETAIL ---------- */
let currentProject = null;
async function openDetail(id) {
  currentProject = await api("/api/projects/" + id);
  document.getElementById("dm-title").textContent = currentProject.name;
  renderDetailTasks();
  // assignee select
  document.getElementById("dm-task-assignee").innerHTML =
    `<option value="">Sin asignar</option>` + users.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join("");
  await loadComments(id);
  document.getElementById("detail-modal").classList.add("open");
}
function renderDetailTasks() {
  const el = document.getElementById("dm-tasks");
  if (!currentProject.tasks.length) { el.innerHTML = `<div class="empty">Sin tareas aún.</div>`; return; }
  el.innerHTML = currentProject.tasks.map(t => `
    <div class="task-row">
      <div class="task-check ${t.done?"done":""}" onclick="toggleTask(${t.id})">${t.done?"✓":""}</div>
      <span class="task-title ${t.done?"done":""}">${esc(t.title)}</span>
      <span class="task-assignee">${esc(t.assignee_name || "Sin asignar")}</span>
      <span class="prio prio-${t.priority}">${t.priority.toUpperCase()}</span>
      <button class="btn btn-danger btn-sm" onclick="deleteTask(${t.id})">✕</button>
    </div>`).join("");
}
async function addTask() {
  const title = document.getElementById("dm-task-title").value.trim();
  if (!title) return;
  const assignee_id = document.getElementById("dm-task-assignee").value || null;
  const priority = document.getElementById("dm-task-prio").value;
  await api(`/api/projects/${currentProject.id}/tasks`, { method:"POST", body: JSON.stringify({ title, assignee_id, priority }) });
  document.getElementById("dm-task-title").value = "";
  await openDetail(currentProject.id);
}
async function toggleTask(id) {
  const t = currentProject.tasks.find(x => x.id === id);
  await api("/api/tasks/" + id, { method:"PATCH", body: JSON.stringify({ done: !t.done }) });
  await openDetail(currentProject.id);
}
async function deleteTask(id) {
  await api("/api/tasks/" + id, { method:"DELETE" });
  await openDetail(currentProject.id);
}
async function loadComments(id) {
  const c = await api(`/api/projects/${id}/comments`);
  const el = document.getElementById("dm-comments");
  el.innerHTML = c.length ? c.map(x => `
    <div class="comment"><span class="time">${x.created_at}</span><span class="author">${esc(x.author)}</span>
    <div class="body">${esc(x.body)}</div></div>`).join("") : `<div class="empty">Sin mensajes.</div>`;
}
async function addComment() {
  const body = document.getElementById("dm-comment").value.trim();
  if (!body) return;
  await api(`/api/projects/${currentProject.id}/comments`, { method:"POST", body: JSON.stringify({ body }) });
  document.getElementById("dm-comment").value = "";
  await loadComments(currentProject.id);
}

/* ---------- WORKLOAD ---------- */
async function loadWorkload() {
  const data = await api("/api/workload");
  const el = document.getElementById("workload-list");
  if (!data.length) { el.innerHTML = `<div class="empty">Sin tareas asignadas.</div>`; return; }
  el.innerHTML = data.map(m => {
    let color = "var(--green)";
    if (m.loadPct>=80) color="var(--red)"; else if (m.loadPct>=55) color="var(--amber)"; else if (m.loadPct>=30) color="var(--teal)";
    const flag = m.loadPct>=80 ? " · ⚠ Sobrecargado" : "";
    return `<div class="workload-row">
      <div class="wl-head"><span class="wl-name">${esc(m.name)}</span><span class="wl-pct" style="color:${color}">${m.loadPct}% carga${flag}</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${m.loadPct}%;background:${color}"></div></div>
      <div class="wl-stats">${m.pending} tareas pendientes · ${m.total} asignadas en total</div></div>`;
  }).join("");
}

/* ---------- INTEGRATIONS ---------- */
async function loadIntegrations() {
  const data = await api("/api/integrations");
  const el = document.getElementById("integrations-list");
  const isAdmin = me.role === "admin";
  el.innerHTML = data.map(i => `
    <div class="int-row">
      <div><span class="dot ${i.status==="conectado"?"on":"off"}"></span>
        <span class="int-name">${esc(i.tool)}</span>
        <div class="int-sync">${i.status==="conectado" ? "Última sincronización: "+(i.last_sync||"—") : "No conectado"}</div>
      </div>
      ${isAdmin ? `<button class="btn ${i.status==="conectado"?"btn-danger":"btn-primary"} btn-sm" onclick="toggleIntegration(${i.id})">${i.status==="conectado"?"Desconectar":"Conectar"}</button>` : ""}
    </div>`).join("");
}
async function toggleIntegration(id) {
  await api(`/api/integrations/${id}/toggle`, { method:"POST" });
  loadIntegrations();
}

/* ---------- AUDIT ---------- */
async function loadAudit() {
  try {
    const data = await api("/api/audit");
    const el = document.getElementById("audit-list");
    el.innerHTML = data.length ? data.map(a => `
      <div class="audit-row"><span class="audit-time">${a.created_at}</span>
      <span class="audit-action">${esc(a.action)}</span>
      <span>${esc(a.user_name || "sistema")}: ${esc(a.detail || "")}</span></div>`).join("")
      : `<div class="empty">Sin registros.</div>`;
  } catch (e) {
    document.getElementById("audit-list").innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

/* ---------- NEW PROJECT ---------- */
function openProjectModal(){ ["pm-name","pm-desc","pm-deadline"].forEach(i=>document.getElementById(i).value=""); document.getElementById("project-modal").classList.add("open"); }
async function saveProject() {
  const name = document.getElementById("pm-name").value.trim();
  if (!name) { alert("Ingresa un nombre."); return; }
  try {
    await api("/api/projects", { method:"POST", body: JSON.stringify({
      name, description: document.getElementById("pm-desc").value, deadline: document.getElementById("pm-deadline").value }) });
    closeModal("project-modal"); loadProjects(); loadDashboard();
  } catch (e) { alert(e.message); }
}
function closeModal(id){ document.getElementById(id).classList.remove("open"); }
document.querySelectorAll(".modal-bg").forEach(bg => bg.addEventListener("click", e => { if (e.target===bg) bg.classList.remove("open"); }));
document.getElementById("login-pass").addEventListener("keydown", e => { if (e.key==="Enter") doLogin(); });

/* ---------- INIT ---------- */
if (token && me) enterApp(); else document.getElementById("login-screen").classList.remove("hidden");
