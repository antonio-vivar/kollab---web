// Autenticación local para el MVP (sin backend ni nube).
// Valida las credenciales en el navegador contra un conjunto fijo de
// cuentas demo. No hay JWT ni servidor verificando nada: el objetivo de
// esta etapa es demostrar el comportamiento de los 3 roles (RBAC), no
// implementar seguridad de producción. Esa parte queda para cuando se
// despliegue la plataforma SaaS real (Opción A del informe EP3).

export type Role = "admin" | "gerente" | "colaborador";

// Forma del usuario ya autenticado, tal como lo recibe el resto de la app
// (MainApp, topbar, etc.) una vez que el login fue exitoso.
export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  initials: string;
  color: string;
}

// Forma interna de una cuenta demo: incluye la contraseña en texto plano
// porque vive solo en este archivo y nunca sale del bundle del frontend.
// En un sistema real esto jamás se haría así (las contraseñas se guardan
// con hash en el servidor); aquí es aceptable porque no hay datos reales
// de usuarios ni nada que proteger.
interface Account {
  email: string;
  password: string;
  name: string;
  role: Role;
}

// Las 3 cuentas de la demo, una por cada rol del sistema.
const ACCOUNTS: Account[] = [
  { email: "admin@kollab.cl",       password: "admin123",   name: "Antonio Vivar", role: "admin" },
  { email: "ceo@kollab.cl",         password: "gerente123", name: "Carla Méndez",  role: "gerente" },
  { email: "colaborador@kollab.cl", password: "colab123",   name: "Diego Soto",    role: "colaborador" },
];

// Mismo set de credenciales pero indexado por rol, para que el botón
// "acceso rápido" del login pueda rellenar el formulario sin que el
// usuario tenga que escribir el correo y la clave a mano.
export const DEMO_CREDENTIALS: Record<Role, { email: string; password: string }> = {
  admin:       { email: "admin@kollab.cl",       password: "admin123" },
  gerente:     { email: "ceo@kollab.cl",         password: "gerente123" },
  colaborador: { email: "colaborador@kollab.cl", password: "colab123" },
};

// Cada rol tiene un color fijo, usado en el avatar y la topbar para que
// se reconozca a simple vista qué tipo de usuario está conectado.
const colorFor = (role: Role) =>
  role === "admin" ? "#00BCD4" : role === "gerente" ? "#26A69A" : "#1E88E5";

// Genera las iniciales del nombre (ej. "Carla Méndez" -> "CM") para
// mostrarlas en el avatar circular cuando no hay foto de perfil.
const initialsOf = (name: string) =>
  name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

// Punto de entrada del login: recibe lo que el usuario escribió en el
// formulario y lo compara contra las cuentas demo. Si coincide email +
// password, devuelve el AuthUser ya armado (con rol, iniciales y color);
// si no, devuelve null y el formulario muestra "credenciales inválidas".
export function signInLocal(email: string, password: string): AuthUser | null {
  const acc = ACCOUNTS.find(
    a => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
  );
  if (!acc) return null;
  return {
    id: acc.role, // como solo hay 3 cuentas fijas, el rol ya es un id único y estable
    name: acc.name,
    role: acc.role,
    initials: initialsOf(acc.name),
    color: colorFor(acc.role),
  };
}
