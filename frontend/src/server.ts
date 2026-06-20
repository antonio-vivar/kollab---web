import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

// Forma mínima del manejador de peticiones que expone TanStack Start
// para el render del lado servidor (SSR): recibe la petición HTTP y
// devuelve una respuesta.
type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

// El módulo real de TanStack Start se importa de forma diferida (solo la
// primera vez que se necesita) y se reutiliza en las siguientes
// peticiones, en vez de volver a importarlo cada vez.
let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 (el servidor HTTP interno que usa TanStack Start) "traga" los
// errores lanzados dentro del handler y los convierte en una respuesta
// 500 genérica con el cuerpo {"unhandled":true,"message":"HTTPError"} —
// un try/catch normal nunca llega a capturar ese error porque ya fue
// transformado en una respuesta válida antes de llegar aquí.
// Esta función detecta ese caso particular (un error 500 "genérico" en
// formato JSON) y lo reemplaza por una página de error legible para el
// usuario, recuperando el error real capturado en error-capture.ts.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response; // no es un error de servidor: se deja pasar tal cual
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response; // no coincide con la firma del error "tragado" por h3
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Punto de entrada que usa el entorno de despliegue (ej. Cloudflare
// Workers) para procesar cada petición HTTP que llega al servidor.
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      // Cualquier error no controlado durante el SSR también termina
      // mostrando la página de error genérica, en vez de romper la petición.
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
