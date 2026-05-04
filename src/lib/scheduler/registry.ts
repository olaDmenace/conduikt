import type { ExecutionHandler } from "./types";

// Per-process handler registry. Each execution_type maps to one async
// function that takes the row's payload and returns ok or error.
//
// Handlers register themselves at module-eval time (see registerHandlers()
// below). The cron tick endpoint imports `registerHandlers` once at the
// top of its file so all handlers are present before the first dispatch.

const HANDLERS = new Map<string, ExecutionHandler>();

export function registerHandler(
  executionType: string,
  handler: ExecutionHandler
): void {
  if (HANDLERS.has(executionType)) {
    // Re-registration shouldn't happen in normal flow but is safe in dev
    // hot-reload — overwrite without crashing.
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[scheduler] handler for "${executionType}" was re-registered`
      );
    }
  }
  HANDLERS.set(executionType, handler);
}

export function getHandler(executionType: string): ExecutionHandler | undefined {
  return HANDLERS.get(executionType);
}

export function listRegisteredTypes(): string[] {
  return Array.from(HANDLERS.keys()).sort();
}

// For tests — clears the registry so each test starts clean.
export function _resetHandlersForTesting(): void {
  HANDLERS.clear();
}
