import process from "node:process";

// Configuración exclusiva del servidor. El sufijo ".server.ts" evita que
// Vite incluya este archivo en el bundle del cliente — estos valores
// nunca llegan al navegador.
//
// En Cloudflare Workers, las variables de entorno se asignan en el
// momento de cada petición (request). Si se leen a nivel de módulo
// (ej. `const x = process.env.X` fuera de una función), el valor llega
// undefined — por eso process.env siempre debe leerse DENTRO de una
// función o handler.
//
// Cuándo usar cada forma de leer variables de entorno:
//   - módulo .server.ts (este archivo): helpers exclusivos del servidor
//     reutilizados entre varios handlers. Hay que envolver la lectura en
//     una función para que se ejecute en cada petición.
//   - process.env directo dentro de un handler de createServerFn: para
//     lecturas puntuales que no se reutilizan en otro lado.
//   - import.meta.env.VITE_FOO: configuración PÚBLICA, legible tanto en
//     el cliente como en el servidor (ej. IDs de analítica, URLs
//     públicas). Se define en el archivo .env con el prefijo VITE_.
//     Nunca poner secretos aquí — terminan expuestos en el navegador.

// En este proyecto no se usan variables de entorno propias del backend
// (no hay base de datos ni claves secretas que proteger): la función
// solo expone el modo de ejecución (development/production) de Node.
export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    // Agregar aquí valores exclusivos del servidor si se necesitan, ej.:
    //   databaseUrl: process.env.DATABASE_URL,
    //   stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  };
}
