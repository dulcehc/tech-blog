import type { CollectionEntry } from "astro:content";
import { eventSlug, siteUrl } from "./format";

export type Neighbor = {
  href: string;
  title: string;
};

export function journalNeighbors(
  events: CollectionEntry<"events">[],
  currentId: string,
): { previous?: Neighbor; next?: Neighbor } {
  const ordered = [...events].sort((a, b) =>
    a.data.date.localeCompare(b.data.date),
  );
  const index = ordered.findIndex((event) => event.id === currentId);
  if (index === -1) return {};

  const toNeighbor = (event: CollectionEntry<"events">): Neighbor => ({
    href: siteUrl(`events/${eventSlug(event.id)}/`),
    title: event.data.title,
  });

  const previousEvent = ordered[index - 1];
  const nextEvent = ordered[index + 1];

  return {
    previous: previousEvent ? toNeighbor(previousEvent) : undefined,
    next: nextEvent ? toNeighbor(nextEvent) : undefined,
  };
}
