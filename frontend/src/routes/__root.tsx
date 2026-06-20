import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

// Pantalla que se muestra cuando la URL no corresponde a ninguna ruta
// definida (en este proyecto, cualquier dirección distinta de "/").
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Pantalla de respaldo que TanStack Router muestra automáticamente si
// algún componente de una ruta lanza un error durante el renderizado.
// Es la "red de seguridad" para que, ante un bug, el usuario vea un
// mensaje claro con la opción de reintentar, en vez de una pantalla en
// blanco o un error crudo del navegador.
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  // Reporta el error a Lovable (la herramienta usada para el diseño
  // inicial de la interfaz) para fines de monitoreo durante el desarrollo.
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate(); // descarta el cache del router e intenta cargar la ruta de nuevo
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// Ruta raíz de la aplicación: es el "molde" (layout) en el que se monta
// cualquier otra ruta. Aquí se define el <head> del HTML (título,
// metadatos para redes sociales, fuentes), y se conectan los componentes
// de error/404 definidos arriba.
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kollab — Gestión del Trabajo Remoto e Híbrido" },
      { name: "description", content: "Plataforma colaborativa para gestionar proyectos, equipos y herramientas en entornos remotos e híbridos." },
      { name: "author", content: "Kollab" },
      // Metadatos Open Graph / Twitter: controlan cómo se ve la vista
      // previa del sitio al compartirlo en redes sociales o chats.
      { property: "og:title", content: "Kollab — Gestión del Trabajo Remoto e Híbrido" },
      { property: "og:description", content: "Plataforma colaborativa para gestionar proyectos, equipos y herramientas en entornos remotos e híbridos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Kollab" },
    ],
    links: [
      // Precarga las conexiones a Google Fonts para que la tipografía
      // Inter cargue más rápido, y enlaza la hoja de estilos compilada
      // (styles.css) mediante el sufijo "?url" de Vite.
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// Estructura HTML más externa (<html><head><body>): se usa solo en el
// render del servidor (SSR), para envolver toda la página la primera vez.
function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Componente que realmente se monta dentro del <body>. Provee el
// QueryClient (compartido por toda la app) y renderiza, mediante
// <Outlet />, la ruta hija que corresponda según la URL actual.
function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
