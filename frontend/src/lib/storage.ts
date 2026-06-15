// Persistencia local del MVP: el estado de la "base de datos" (proyectos,
// tareas, comentarios, auditoría, integraciones) se guarda en localStorage,
// de modo que los cambios sobreviven a las recargas sin necesidad de servidor.

import { useEffect, useState } from "react";

const PREFIX = "kollab:";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback; // SSR: no hay localStorage
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* cuota llena o almacenamiento bloqueado: se ignora */
  }
}

// Estado de React sincronizado con localStorage. Se inicializa con lo
// guardado (o el seed) y persiste en cada cambio.
export function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => read(key, initial));
  useEffect(() => {
    write(key, state);
  }, [key, state]);
  return [state, setState] as const;
}

// Borra todos los datos del MVP para volver al estado inicial ("reiniciar demo").
export function resetKollabData() {
  if (typeof window === "undefined") return;
  Object.keys(window.localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => window.localStorage.removeItem(k));
}
