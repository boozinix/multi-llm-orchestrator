/** True if at least one provider key is set server-side (direct or OpenRouter). */
export function hasAnyProviderEnvKey(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() ||
      process.env.ANTHROPIC_API_KEY?.trim() ||
      process.env.XAI_API_KEY?.trim() ||
      process.env.DEEPSEEK_API_KEY?.trim() ||
      process.env.OPENROUTER_API_KEY?.trim()
  );
}

/**
 * Non-empty string passed into orchestrator as fallback when a provider env key is missing.
 * Prefer client key, then any server key so callModel's `env || client` pattern works.
 */
export function resolvePassthroughApiKey(clientKey: string): string {
  const c = clientKey.trim();
  if (c) return c;
  return (
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.XAI_API_KEY?.trim() ||
    process.env.DEEPSEEK_API_KEY?.trim() ||
    ""
  );
}
