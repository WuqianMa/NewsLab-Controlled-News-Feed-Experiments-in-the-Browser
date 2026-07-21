// Pure assignment + feed-order logic (fable/07): the feed order is computed
// ONCE at consent time and stored on the participant row. Everything here takes
// data in and returns data out — DB writes happen in the join route.

interface ConditionForAssignment {
  id: string;
  weight: number;
  createdAt: Date;
}

export function assignCondition<T extends ConditionForAssignment>(
  method: string,
  conditions: T[],
  countsByCondition: Map<string, number>,
  totalParticipants: number
): T {
  if (conditions.length === 0) throw new Error("experiment has no conditions");
  const ordered = [...conditions].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  if (method === "sequential") {
    return ordered[totalParticipants % ordered.length];
  }

  if (method === "balanced") {
    // Pick argmin(count / weight); ties broken randomly. Racy under concurrent
    // consents by at most ±1 — acceptable at prototype scale (fable/07).
    let best: T[] = [];
    let bestScore = Infinity;
    for (const c of ordered) {
      const score = (countsByCondition.get(c.id) ?? 0) / (c.weight || 1);
      if (score < bestScore - 1e-9) {
        best = [c];
        bestScore = score;
      } else if (Math.abs(score - bestScore) < 1e-9) {
        best.push(c);
      }
    }
    return best[Math.floor(Math.random() * best.length)];
  }

  // random (default)
  return ordered[Math.floor(Math.random() * ordered.length)];
}

interface OrderableItem {
  id: string;
  publishedAt: Date;
  approved: boolean;
}

export function materializeFeedOrder(
  feedOrder: string,
  maxItems: number | null,
  itemsInSetOrder: OrderableItem[]
): string[] {
  let items = itemsInSetOrder.filter((i) => i.approved);

  if (feedOrder === "shuffled") {
    items = [...items];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  } else if (feedOrder === "reverse_chronological") {
    items = [...items].sort(
      (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
    );
  }

  if (maxItems != null && maxItems > 0) items = items.slice(0, maxItems);
  return items.map((i) => i.id);
}
