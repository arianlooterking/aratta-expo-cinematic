/** Apply one realtime change to a list of rows keyed by id. Pure, for tests. */
export function applyChange<R extends { id: string }>(
  rows: readonly R[],
  change: { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Partial<R>; old: Partial<R> },
): R[] {
  if (change.eventType === "DELETE") {
    const id = change.old.id;
    return id ? rows.filter((row) => row.id !== id) : [...rows];
  }
  const next = change.new as R;
  if (!next?.id) return [...rows];
  const index = rows.findIndex((row) => row.id === next.id);
  if (index === -1) return [...rows, next];
  const copy = [...rows];
  copy[index] = { ...copy[index], ...next };
  return copy;
}
