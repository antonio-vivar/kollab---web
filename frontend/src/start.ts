import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

// Middleware de servidor que envuelve cada petición: si algo más
// adelante en la cadena lanza un error (por ejemplo, un bug dentro de
// una server function), lo atrapa aquí y devuelve una página de error
// legible en vez de dejar que se rompa la petición sin control.
const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // Si el error ya trae su propio código de estado HTTP (statusCode),
    // se deja pasar tal cual: significa que es un error "esperado" que
    // el framework ya sabe cómo manejar (ej. un 404 controlado).
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Instancia central de configuración de TanStack Start, donde se registra
// el middleware de error para que se aplique a todas las peticiones.
export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
