// Autenticación local para el MVP (sin backend ni nube).
// Valida las credenciales en el navegador contra un conjunto fijo de
// cuentas demo. La seguridad real (RLS/JWT) corresponde al despliegue
// productivo; aquí solo se distingue el rol para la experiencia RBAC.

export type Role = "admin" | "gerente" | "colaborador";

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  initials: string;
  color: string;
}

interface Account {
  email: string;
  password: string;
  name: string;
  role: Role;
}

// Cuentas demo locales (mismas credenciales de la versión original).
const ACCOUNTS: Account[] = [
  { email: "admin@kollab.cl",       password: "admin123",   name: "Antonio Vivar", role: "admin" },
  { email: "ceo@kollab.cl",         password: "gerente123", name: "Carla Méndez",  role: "gerente" },
  { email: "colaborador@kollab.cl", password: "colab123",   name: "Diego Soto",    role: "colaborador" },
];

// Para los botones de "acceso rápido" del login.
export const DEMO_CREDENTIALS: Record<Role, { email: string; password: string }> = {
  admin:       { email: "admin@kollab.cl",       password: "admin123" },
  gerente:     { email: "ceo@kollab.cl",         password: "gerente123" },
  colaborador: { email: "colaborador@kollab.cl", password: "colab123" },
};

const colorFor = (role: Role) =>
  role === "admin" ? "#00BCD4" : role === "gerente" ? "#26A69A" : "#1E88E5";

const initialsOf = (name: string) =>
  name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

// Devuelve el usuario si las credenciales son válidas, o null si no.
export function signInLocal(email: string, password: string): AuthUser | null {
  const acc = ACCOUNTS.find(
    a => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
  );
  if (!acc) return null;
  return {
    id: acc.role, // id estable por rol; suficiente para el MVP
    name: acc.name,
    role: acc.role,
    initials: initialsOf(acc.name),
    color: colorFor(acc.role),
  };
}
