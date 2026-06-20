import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Combina clases de Tailwind de forma segura: "clsx" permite pasar
// condicionales (ej. cn("btn", isActive && "btn-active")), y "twMerge"
// resuelve los conflictos cuando dos clases afectan la misma propiedad
// (ej. "p-2" y "p-4" juntas: se queda solo con la última, en vez de que
// ambas terminen aplicadas y el resultado dependa del orden del CSS).
// Es la función estándar que usan todos los componentes de shadcn/ui
// para construir su className final a partir de props y valores fijos.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
