// Persistencia local del MVP: el estado de la "base de datos" (proyectos,
// tareas, comentarios, auditoría, integraciones) se guarda en localStorage,
// el almacenamiento que el propio navegador ofrece por dominio. De este modo
// los cambios que hace el usuario sobreviven a recargar la página, aunque no
// exista un servidor ni una base de datos real detrás.

import { useEffect, useState } from "react";

// Prefijo para todas las claves que este archivo guarda en localStorage,
// así se evita pisar otras claves que pudiera usar el navegador o el sitio.
const PREFIX = "kollab:";

// Lee un valor guardado en localStorage y lo convierte de JSON a objeto.
// Si no existe, hubo un error de parseo, o el código corre en el servidor
// (donde no existe "window"), devuelve el valor por defecto (fallback)
// en vez de fallar.
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback; // SSR: no hay localStorage
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Guarda un valor en localStorage, convirtiéndolo a texto JSON. Si el
// almacenamiento está lleno o bloqueado por el navegador, simplemente
// no hace nada (no rompe la app por un error de guardado).
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* cuota llena o almacenamiento bloqueado: se ignora */
  }
}

// Hook personalizado que se comporta igual que useState, pero además
// sincroniza automáticamente su valor con localStorage:
//  - al montar el componente, carga lo que ya estaba guardado (o el
//    valor inicial "initial" si es la primera vez que se usa);
//  - cada vez que el estado cambia, lo vuelve a guardar.
// Así, componentes como MainApp pueden usarlo exactamente igual que
// useState, sin preocuparse de cuándo leer o escribir en el navegador.
export function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => read(key, initial));
  useEffect(() => {
    write(key, state);
  }, [key, state]);
  return [state, setState] as const;
}

// Borra todos los datos guardados del MVP (todas las claves que empiezan
// con el prefijo "kollab:"), dejando la app como si fuera la primera vez
// que se abre. Útil para "reiniciar la demo" antes de una presentación.
export function resetKollabData() {
  if (typeof window === "undefined") return;
  Object.keys(window.localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => window.localStorage.removeItem(k));
}
