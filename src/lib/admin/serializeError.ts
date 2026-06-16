/**
 * Make sure errors land in logs as human-readable strings instead of
 * `[object Object]`. Used everywhere bootstrap code touches the network.
 */
export function serializeError(error: unknown): string {
  if (error == null) return "Unknown error (null)";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    return error.stack ? `${error.message}\n${error.stack}` : error.message;
  }
  try {
    return JSON.stringify(error, Object.getOwnPropertyNames(error as object));
  } catch {
    return String(error);
  }
}