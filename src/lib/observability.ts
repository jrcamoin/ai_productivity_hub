type Context = Record<string, unknown>;

function serializeError(error: unknown) {
  if (!(error instanceof Error)) return { value: String(error) };
  return {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack
  };
}

export function logInfo(event: string, context: Context = {}) {
  console.info(JSON.stringify({ level: "info", event, timestamp: new Date().toISOString(), ...context }));
}

export function logError(event: string, error: unknown, context: Context = {}) {
  console.error(JSON.stringify({
    level: "error",
    event,
    timestamp: new Date().toISOString(),
    error: serializeError(error),
    ...context
  }));
}
