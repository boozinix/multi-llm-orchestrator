import { emptyProviderKeys, normalizeProviderKeys, type UserProviderKeys } from "@/lib/provider-keys";

/**
 * Production: server OpenRouter key only (ignore client-supplied secrets).
 * Development: optional `devRouting` — openrouter prefers OPENROUTER_API_KEY; direct uses BYOK / .env via `resolvedKeyForProvider`.
 */
export function resolveChatProviderKeys(params: {
  fromClient: UserProviderKeys | undefined;
  devRouting?: "openrouter" | "direct";
}): UserProviderKeys {
  const client = normalizeProviderKeys(params.fromClient);

  if (process.env.NODE_ENV === "production") {
    return {
      ...emptyProviderKeys(),
      openrouter: process.env.OPENROUTER_API_KEY?.trim() ?? "",
    };
  }

  const routing = params.devRouting ?? "openrouter";
  if (routing === "openrouter") {
    const envOr = process.env.OPENROUTER_API_KEY?.trim() ?? "";
    return {
      ...client,
      openrouter: client.openrouter.trim() || envOr,
    };
  }

  return client;
}
