/** Prefer unseen recent targets, then avoid repeating compound fragments nearby. */
export function takeFresh<T>(bag: T[], history: readonly string[], text: (item: T) => string): T {
  const recent = history.slice(-10);
  const eligible = bag.map((item, index) => ({ item, index })).filter(({ item }) => !recent.includes(text(item)));
  const candidates = eligible.length ? eligible : bag.map((item, index) => ({ item, index }));
  const fragments = history.slice(-3).flatMap(word => [...word].slice(1).map((_, i) => word.slice(i, i + 2)));
  const chosen = candidates.find(({ item }) => !fragments.some(part => text(item).includes(part))) ?? candidates[0]!;
  return bag.splice(chosen.index, 1)[0]!;
}
