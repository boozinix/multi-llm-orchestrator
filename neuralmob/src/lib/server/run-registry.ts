/**
 * Run registry — tracks active streaming runs and their per-slot skip resolvers.
 *
 * When a bot slot is running in parallel, we register a skip function for it.
 * Calling skipSlot() resolves a promise that races against the bot's actual call,
 * causing the orchestrator to treat that slot as null (skipped) and proceed.
 */

type SlotSkipper = () => void;
type RunEntry = Map<string, SlotSkipper>; // slotId → skip fn

// Module-level map persists across requests in the same server process.
const registry = new Map<string, RunEntry>();

export function createRunEntry(runId: string): RunEntry {
  const entry: RunEntry = new Map();
  registry.set(runId, entry);
  return entry;
}

export function registerSlotSkipper(runId: string, slotId: string, skip: SlotSkipper): void {
  registry.get(runId)?.set(slotId, skip);
}

/** Returns true if the slot was found and skipped, false if runId/slotId unknown. */
export function skipSlot(runId: string, slotId: string): boolean {
  const entry = registry.get(runId);
  if (!entry) return false;
  const skip = entry.get(slotId);
  if (!skip) return false;
  skip();
  entry.delete(slotId); // prevent double-skip
  return true;
}

export function removeRunEntry(runId: string): void {
  registry.delete(runId);
}
