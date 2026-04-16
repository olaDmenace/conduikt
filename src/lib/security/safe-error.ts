/**
 * Return a safe error message for API responses.
 * In production, hides internal details. In development, passes through.
 */
export function safeError(error: unknown, fallback = "An unexpected error occurred"): string {
  if (process.env.NODE_ENV === "development") {
    return error instanceof Error ? error.message : String(error);
  }
  return fallback;
}
