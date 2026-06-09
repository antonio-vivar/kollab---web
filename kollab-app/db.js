"use strict";
/**
 * Capa de datos — Kollab
 * Base de datos SQLite operativa (node:sqlite integrado).
 * En producción es directamente reemplazable por PostgreSQL / Supabase
 * sin tocar la lógica de negocio (mismo modelo relacional).
 */
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "kollab.db"));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'colaborador',   -- admin | gerente | colaborador (RBAC)
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'curso',        -- curso | riesgo | completado
    deadline TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    assignee_id INTEGER,
    priority TEXT NOT NULL DEFAULT 'media',       -- alta | media | baja
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(assignee_id) REFERENCES users(id)
  );

  -- RF-04: comunicacion estructurada y trazable (historial por proyecto)
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  -- RF-04 / RNF-03: trazabilidad (bitacora de auditoria)
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- RF-05: integracion con herramientas existentes (registro de conectores)
  CREATE TABLE IF NOT EXISTS integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'desconectado',  -- conectado | desconectado
    last_sync TEXT
  );
`);

// ---- Seed (solo si la BD esta vacia) ----
const userCount = db.prepare("SELECT COUNT(*) c FROM users").get().c;
if (userCount === 0) {
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const insUser = db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?)");
  insUser.run("Antonio Vivar", "admin@kollab.cl", hash("admin123"), "admin");
  insUser.run("Alejandro Paredes", "ceo@kollab.cl", hash("gerente123"), "gerente");
  insUser.run("Francisco Levipil", "colaborador@kollab.cl", hash("colab123"), "colaborador");
  insUser.run("Carla Rojas", "carla@kollab.cl", hash("colab123"), "colaborador");
  insUser.run("Diego Castillo", "diego@kollab.cl", hash("colab123"), "colaborador");

  const insProj = db.prepare("INSERT INTO projects(name,description,status,deadline) VALUES (?,?,?,?)");
  const p1 = insProj.run("Migración Plataforma SaaS", "Implementación de la plataforma integrada Kollab", "curso", "2026-07-15").lastInsertRowid;
  const p2 = insProj.run("Onboarding Equipo Remoto", "Capacitación y adopción por área", "riesgo", "2026-06-20").lastInsertRowid;
  const p3 = insProj.run("Dashboard de KPIs Gerenciales", "Vistas ejecutivas en tiempo real", "curso", "2026-08-30").lastInsertRowid;

  const insTask = db.prepare("INSERT INTO tasks(project_id,title,assignee_id,priority,done) VALUES (?,?,?,?,?)");
  insTask.run(p1, "Levantar requerimientos con CTO", 1, "alta", 1);
  insTask.run(p1, "Validar APIs de integración", 3, "alta", 1);
  insTask.run(p1, "Configurar RBAC y MFA", 4, "alta", 0);
  insTask.run(p1, "Migrar datos históricos", 1, "media", 0);
  insTask.run(p2, "Diseñar plan de capacitación", 5, "alta", 1);
  insTask.run(p2, "Designar champions por área", 2, "media", 0);
  insTask.run(p2, "Crear material de adopción", 4, "media", 0);
  insTask.run(p3, "Definir métricas con gerencia", 1, "alta", 1);
  insTask.run(p3, "Construir vistas ejecutivas", 3, "media", 1);

  const insInt = db.prepare("INSERT INTO integrations(tool,status,last_sync) VALUES (?,?,?)");
  insInt.run("Slack", "conectado", "2026-06-08 09:30");
  insInt.run("Google Drive", "conectado", "2026-06-08 09:30");
  insInt.run("Zoom", "desconectado", null);
  insInt.run("Jira", "desconectado", null);
  insInt.run("Trello", "desconectado", null);

  db.prepare("INSERT INTO audit_log(user_id,action,detail) VALUES (?,?,?)")
    .run(1, "SEED", "Base de datos inicializada con datos de demostración");
  console.log("[db] Base de datos creada y poblada con datos de ejemplo.");
}

module.exports = db;
