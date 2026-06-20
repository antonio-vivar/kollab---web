// El paquete @lovable.dev/vite-tanstack-config ya incluye lo siguiente —
// NO agregarlo manualmente o la app se rompe por plugins duplicados:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (solo en
//     build, usa cloudflare como destino por defecto), componentTagger
//     (solo en desarrollo), inyección de variables VITE_*, el alias de
//     ruta "@", deduplicación de React/TanStack, plugins de registro de
//     errores, y detección de entorno sandbox (puerto/host/strictPort).
// Se puede pasar configuración adicional vía defineConfig({ vite: {...}, etc }) si se necesita.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirige el punto de entrada del servidor que arma TanStack Start
    // hacia src/server.ts (nuestro envoltorio de manejo de errores SSR).
    // nitro/vite construyen el build del servidor a partir de este archivo.
    server: { entry: "server" },
  },
});
