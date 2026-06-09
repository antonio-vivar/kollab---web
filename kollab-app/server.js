"use strict";
/**
 * Kollab — Servidor API REST (Node.js + Express)
 * Plataforma integrada de gestión del trabajo remoto e híbrido.
 *
 * Resuelve los requerimientos del proyecto:
 *   RF-01  Gestión de proyectos y tareas            -> /api/projects, /api/tasks
 *   RF-02  Monitoreo de carga laboral               -> /api/workload
 *   RF-03  Paneles de KPIs / métricas               -> /api/kpis
 *   RF-04  Comunicación estructurada y trazable     -> /api/projects/:id/comments, /api/audit
 *   RF-05  Integración con herramientas existentes  -> /api/integrations
 *   RNF-03 Seguridad: hashing + JWT + RBAC + auditoría
 */
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "kollab-dev-secret-cambiar-en-produccion";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- utilidades ----------
function audit(userId, action, detail) {
  try { db.prepare("INSERT INTO audit_log(user_id,action,detail) VALUES (?,?,?)").run(userId ?? null, action, detail ?? null); }
  catch (e) { console.warn("audit error", e.message); }
}
function publicUser(u) { return { id: u.id, name: u.name, email: u.email, role: u.role }; }

// ---------- middleware de autenticación (JWT) ----------
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}
// ---------- middleware de roles (RBAC) ----------
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: "No autorizado para esta acción" });
    next();
  };
}

// ================= AUTENTICACIÓN =================
app.post("/api/auth/register", (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Datos incompletos" });
  const exists = db.prepare("SELECT id FROM users WHERE email=?").get(email);
  if (exists) return res.status(409).json({ error: "El email ya está registrado" });
  const hash = bcrypt.hashSync(password, 10);
  const safeRole = ["admin", "gerente", "colaborador"].includes(role) ? role : "colaborador";
  const r = db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?)").run(name, email, hash, safeRole);
  audit(r.lastInsertRowid, "REGISTER", `Usuario ${email} registrado`);
  res.status(201).json({ ok: true });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const u = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  if (!u || !bcrypt.compareSync(password || "", u.password_hash)) {
    audit(u ? u.id : null, "LOGIN_FAIL", `Intento fallido para ${email}`);
    return res.status(401).json({ error: "Credenciales inválidas" });
  }
  const token = jwt.sign({ id: u.id, name: u.name, role: u.role }, JWT_SECRET, { expiresIn: "8h" });
  audit(u.id, "LOGIN", `${u.email} inició sesión`);
  res.json({ token, user: publicUser(u) });
});

app.get("/api/me", auth, (req, res) => res.json(req.user));
app.get("/api/users", auth, (req, res) =>
  res.json(db.prepare("SELECT id,name,email,role FROM users ORDER BY name").all()));

// ================= RF-01: PROYECTOS Y TAREAS =================
function projectWithProgress(p) {
  const tasks = db.prepare("SELECT * FROM tasks WHERE project_id=?").all(p.id);
  const done = tasks.filter(t => t.done).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  let status = p.status;
  if (progress === 100) status = "completado";
  else if (p.deadline && new Date(p.deadline) < new Date(new Date().toDateString())) status = "atrasado";
  return { ...p, taskCount: tasks.length, doneCount: done, progress, computedStatus: status };
}

app.get("/api/projects", auth, (req, res) => {
  const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
  res.json(projects.map(projectWithProgress));
});

app.get("/api/projects/:id", auth, (req, res) => {
  const p = db.prepare("SELECT * FROM projects WHERE id=?").get(req.params.id);
  if (!p) return res.status(404).json({ error: "Proyecto no encontrado" });
  const tasks = db.prepare(`
    SELECT t.*, u.name AS assignee_name FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id WHERE t.project_id=? ORDER BY t.created_at`).all(p.id);
  res.json({ ...projectWithProgress(p), tasks });
});

// crear proyecto: solo admin o gerente (RBAC)
app.post("/api/projects", auth, requireRole("admin", "gerente"), (req, res) => {
  const { name, description, deadline } = req.body || {};
  if (!name) return res.status(400).json({ error: "Nombre requerido" });
  const r = db.prepare("INSERT INTO projects(name,description,deadline) VALUES (?,?,?)").run(name, description || "", deadline || null);
  audit(req.user.id, "CREATE_PROJECT", `Proyecto "${name}" creado`);
  res.status(201).json(projectWithProgress(db.prepare("SELECT * FROM projects WHERE id=?").get(r.lastInsertRowid)));
});

app.delete("/api/projects/:id", auth, requireRole("admin", "gerente"), (req, res) => {
  const p = db.prepare("SELECT * FROM projects WHERE id=?").get(req.params.id);
  if (!p) return res.status(404).json({ error: "No encontrado" });
  db.prepare("DELETE FROM projects WHERE id=?").run(req.params.id);
  audit(req.user.id, "DELETE_PROJECT", `Proyecto "${p.name}" eliminado`);
  res.json({ ok: true });
});

// tareas
app.post("/api/projects/:id/tasks", auth, (req, res) => {
  const p = db.prepare("SELECT * FROM projects WHERE id=?").get(req.params.id);
  if (!p) return res.status(404).json({ error: "Proyecto no encontrado" });
  const { title, assignee_id, priority } = req.body || {};
  if (!title) return res.status(400).json({ error: "Título requerido" });
  const prio = ["alta", "media", "baja"].includes(priority) ? priority : "media";
  const r = db.prepare("INSERT INTO tasks(project_id,title,assignee_id,priority) VALUES (?,?,?,?)")
    .run(p.id, title, assignee_id || null, prio);
  audit(req.user.id, "CREATE_TASK", `Tarea "${title}" en proyecto ${p.id}`);
  res.status(201).json(db.prepare("SELECT * FROM tasks WHERE id=?").get(r.lastInsertRowid));
});

app.patch("/api/tasks/:id", auth, (req, res) => {
  const t = db.prepare("SELECT * FROM tasks WHERE id=?").get(req.params.id);
  if (!t) return res.status(404).json({ error: "Tarea no encontrada" });
  const done = req.body.done != null ? (req.body.done ? 1 : 0) : t.done;
  db.prepare("UPDATE tasks SET done=? WHERE id=?").run(done, t.id);
  audit(req.user.id, "UPDATE_TASK", `Tarea ${t.id} -> ${done ? "completada" : "reabierta"}`);
  res.json(db.prepare("SELECT * FROM tasks WHERE id=?").get(t.id));
});

app.delete("/api/tasks/:id", auth, (req, res) => {
  const t = db.prepare("SELECT * FROM tasks WHERE id=?").get(req.params.id);
  if (!t) return res.status(404).json({ error: "No encontrada" });
  db.prepare("DELETE FROM tasks WHERE id=?").run(t.id);
  audit(req.user.id, "DELETE_TASK", `Tarea ${t.id} eliminada`);
  res.json({ ok: true });
});

// ================= RF-02: MONITOREO DE CARGA =================
app.get("/api/workload", auth, (req, res) => {
  const weights = { alta: 3, media: 2, baja: 1 };
  const users = db.prepare("SELECT id,name FROM users").all();
  const rows = users.map(u => {
    const tasks = db.prepare("SELECT priority,done FROM tasks WHERE assignee_id=?").all(u.id);
    const total = tasks.length;
    const pending = tasks.filter(t => !t.done);
    const weight = pending.reduce((a, t) => a + (weights[t.priority] || 1), 0);
    return { id: u.id, name: u.name, total, pending: pending.length, weight };
  }).filter(r => r.total > 0);
  const maxWeight = Math.max(1, ...rows.map(r => r.weight));
  rows.forEach(r => r.loadPct = Math.round((r.weight / maxWeight) * 100));
  rows.sort((a, b) => b.loadPct - a.loadPct);
  res.json(rows);
});

// ================= RF-03: KPIs / MÉTRICAS =================
app.get("/api/kpis", auth, (req, res) => {
  const projects = db.prepare("SELECT * FROM projects").all().map(projectWithProgress);
  const total = projects.length;
  const completed = projects.filter(p => p.progress === 100).length;
  const atRisk = projects.filter(p => ["riesgo", "atrasado"].includes(p.computedStatus)).length;
  const allTasks = db.prepare("SELECT done FROM tasks").all();
  const pendingTasks = allTasks.filter(t => !t.done).length;
  const globalProgress = total ? Math.round(projects.reduce((a, p) => a + p.progress, 0) / total) : 0;
  res.json({
    totalProjects: total,
    completedProjects: completed,
    atRiskProjects: atRisk,
    pendingTasks,
    totalTasks: allTasks.length,
    globalProgress
  });
});

// ================= RF-04: COMUNICACIÓN TRAZABLE =================
app.get("/api/projects/:id/comments", auth, (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, u.name AS author FROM comments c
    JOIN users u ON u.id = c.user_id WHERE c.project_id=? ORDER BY c.created_at`).all(req.params.id);
  res.json(rows);
});
app.post("/api/projects/:id/comments", auth, (req, res) => {
  const { body } = req.body || {};
  if (!body) return res.status(400).json({ error: "Mensaje vacío" });
  const r = db.prepare("INSERT INTO comments(project_id,user_id,body) VALUES (?,?,?)")
    .run(req.params.id, req.user.id, body);
  audit(req.user.id, "COMMENT", `Comentario en proyecto ${req.params.id}`);
  res.status(201).json(db.prepare(`
    SELECT c.*, u.name AS author FROM comments c JOIN users u ON u.id=c.user_id WHERE c.id=?`).get(r.lastInsertRowid));
});

// bitácora de auditoría (trazabilidad) — solo admin/gerente
app.get("/api/audit", auth, requireRole("admin", "gerente"), (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, u.name AS user_name FROM audit_log a
    LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 100`).all();
  res.json(rows);
});

// ================= RF-05: INTEGRACIONES =================
app.get("/api/integrations", auth, (req, res) =>
  res.json(db.prepare("SELECT * FROM integrations ORDER BY tool").all()));

app.post("/api/integrations/:id/toggle", auth, requireRole("admin"), (req, res) => {
  const i = db.prepare("SELECT * FROM integrations WHERE id=?").get(req.params.id);
  if (!i) return res.status(404).json({ error: "No encontrada" });
  const newStatus = i.status === "conectado" ? "desconectado" : "conectado";
  const sync = newStatus === "conectado" ? new Date().toISOString().slice(0, 16).replace("T", " ") : null;
  db.prepare("UPDATE integrations SET status=?, last_sync=? WHERE id=?").run(newStatus, sync, i.id);
  audit(req.user.id, "INTEGRATION", `${i.tool} -> ${newStatus}`);
  res.json(db.prepare("SELECT * FROM integrations WHERE id=?").get(i.id));
});

// healthcheck (RNF-01 disponibilidad)
app.get("/api/health", (req, res) => res.json({ status: "ok", ts: Date.now() }));

app.listen(PORT, () => {
  console.log(`\n  Kollab API + App corriendo en http://localhost:${PORT}`);
  console.log(`  Usuarios demo:`);
  console.log(`    admin@kollab.cl / admin123        (admin)`);
  console.log(`    ceo@kollab.cl / gerente123        (gerente)`);
  console.log(`    colaborador@kollab.cl / colab123  (colaborador)\n`);
});

module.exports = app;
