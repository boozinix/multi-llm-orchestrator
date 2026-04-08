/** UI-only / marketing deploy: no LLM calls (set on Vercel as SHOWCASE_MODE=1). */
export function isShowcaseMode(): boolean {
  const v = (process.env.SHOWCASE_MODE ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
