import * as React from "react";

// Punto de quiebre (en píxeles) por debajo del cual se considera que la
// pantalla es de tamaño "móvil". Se usa, por ejemplo, para decidir si el
// menú lateral (sidebar) se muestra fijo o como un panel deslizable.
const MOBILE_BREAKPOINT = 768;

// Hook que indica si la ventana actual es de tamaño móvil, y se actualiza
// automáticamente si el usuario cambia el tamaño de la ventana (o rota
// el dispositivo). Usa matchMedia en vez de leer window.innerWidth en
// cada render, para no recalcular en cada repintado de la página.
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT); // valor inicial al montar el componente
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile; // convierte "undefined" (estado inicial) en "false"
}
