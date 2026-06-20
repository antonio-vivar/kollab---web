import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getServerConfig } from "../config.server";

// Función de ejemplo del template de TanStack Start, no usada por la
// lógica de Kollab. Se invoca desde el cliente así:
//   const result = await getGreeting({ data: { name: "Ada" } })
// El cuerpo de ".handler" corre solo en el servidor — los imports que
// solo se usan ahí (como módulos .server.ts) no se incluyen en el bundle
// del cliente. El código a nivel de módulo (fuera del handler) sí se
// envía al cliente; para helpers verdaderamente exclusivos del servidor,
// deben ir en un archivo .server.ts.
// "z.object({...})" valida que el dato recibido tenga la forma esperada
// antes de ejecutar el handler (si no, lanza un error de validación en
// vez de procesar datos incorrectos).
export const getGreeting = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().min(1) }))
  .handler(async ({ data }) => {
    const config = getServerConfig();
    return {
      greeting: `Hello, ${data.name}!`,
      mode: config.nodeEnv ?? "unknown",
    };
  });
