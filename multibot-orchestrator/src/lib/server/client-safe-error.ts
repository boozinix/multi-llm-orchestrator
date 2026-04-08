/** Avoid leaking stack traces and verbose provider errors to browsers in production. */
export function clientSafeModelError(err: unknown): string {
  if (process.env.NODE_ENV !== "production") {
    return err instanceof Error ? err.message : "Model call failed";
  }
  return "The model request failed. Try again or pick another model. If this persists, check your API keys in Settings.";
}
