// Opciones que describen cómo ocurrió un error, para que la herramienta
// de monitoreo de Lovable (usada durante el desarrollo de la interfaz)
// pueda clasificarlo correctamente.
type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

// Forma del objeto que Lovable inyecta en window cuando el sitio se
// previsualiza dentro de su editor. Si la app corre fuera de Lovable
// (como en producción), este objeto simplemente no existe.
type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
  }
}

// Envía un error al panel de Lovable, si está disponible (operador "?."
// en cada paso evita que falle si window.__lovableEvents no existe, por
// ejemplo cuando la app se ejecuta en el navegador del usuario final y
// no dentro del editor de Lovable).
export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return; // no hacer nada durante el render del servidor
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}
