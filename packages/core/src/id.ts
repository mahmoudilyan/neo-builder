/**
 * Create a stable Element id. Uses crypto.randomUUID where available
 * (Node 20+, modern browsers), with a small fallback.
 */
export function createId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return "el-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
