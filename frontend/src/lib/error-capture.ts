// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

// Guarda en memoria el último error no controlado que ocurrió en el
// proceso, junto con el momento en que pasó. server.ts lo usa para
// recuperar el error real cuando el framework lo "traga" y solo deja
// una respuesta 500 genérica sin detalle.
let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000; // el error guardado se considera válido solo 5 segundos

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

// Se registran listeners globales para capturar tanto errores síncronos
// no atrapados ("error") como promesas rechazadas sin .catch
// ("unhandledrejection"), que es justo el tipo de error que h3 termina
// convirtiendo en una respuesta 500 genérica.
if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

// Devuelve el último error capturado (y lo descarta), siempre que no
// haya pasado más tiempo que TTL_MS desde que ocurrió. Esto evita que
// un error viejo, de una petición anterior, se confunda con el de la
// petición actual.
export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
