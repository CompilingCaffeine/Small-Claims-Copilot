// The timeline: facts with a date that code confirmed is written in their excerpt,
// sorted. Events and payments without such a date are listed as "date unknown",
// never given a guessed one.
import { contentId } from "./ids.ts";
import type { Fact, TimelineEvent } from "./schemas.ts";

const UNDATED_CATEGORIES = new Set<Fact["category"]>(["event", "payment"]);

export function buildTimeline(facts: Fact[]): { timeline: TimelineEvent[]; undated: TimelineEvent[] } {
  const dated = new Map<string, TimelineEvent>();
  const undated: TimelineEvent[] = [];

  for (const fact of facts) {
    if (!fact.eventDate) {
      if (UNDATED_CATEGORIES.has(fact.category)) {
        undated.push({ id: contentId("event", fact.id), label: fact.originalWording, factIds: [fact.id] });
      }
      continue;
    }
    // Several documents often state the same event (the agreement date in the contract
    // and on the receipt): show it once with every source.
    const key = `${fact.eventDate}|${fact.subject}`;
    const existing = dated.get(key);
    if (existing) existing.factIds.push(fact.id);
    else dated.set(key, { id: contentId("event", key), date: fact.eventDate, label: fact.originalWording, factIds: [fact.id] });
  }

  // Stable sort: same-day events keep document order.
  const timeline = [...dated.values()].sort((a, b) => a.date!.localeCompare(b.date!));
  return { timeline, undated };
}
