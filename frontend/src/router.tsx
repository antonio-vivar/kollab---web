import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Crea la instancia del router de la aplicación. "routeTree" viene de
// routeTree.gen.ts, un archivo que TanStack Router regenera solo a partir
// de los archivos dentro de la carpeta routes/ (en este proyecto, solo
// existe la ruta "/" en routes/index.tsx).
export const getRouter = () => {
  // QueryClient de TanStack Query: se crea uno por cada llamada a getRouter
  // para que cada renderizado del servidor tenga su propio cache aislado
  // (evita que datos de un usuario se filtren a la respuesta de otro).
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient }, // disponible en cualquier ruta vía Route.useRouteContext()
    scrollRestoration: true,   // restaura la posición del scroll al navegar atrás/adelante
    defaultPreloadStaleTime: 0, // siempre vuelve a precargar datos en vez de usar cache antiguo
  });

  return router;
};
