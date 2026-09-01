import type { CollectionEntry } from "astro:content";

export type EventEntry = CollectionEntry<"events">;

export type MonthGroup = {
  key: string;
  heading: string;
  year: string;
  month: string;
  events: EventEntry[];
};

export function eventYear(iso: string): string {
  return iso.slice(0, 4);
}

export function eventMonth(iso: string): string {
  return iso.slice(5, 7);
}

export function monthShortLabel(month: string): string {
  return new Date(`2026-${month}-15T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
  });
}

export function monthHeading(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function uniqueYears(events: EventEntry[]): string[] {
  return [...new Set(events.map((event) => eventYear(event.data.date)))].sort(
    (a, b) => b.localeCompare(a),
  );
}

export function uniqueMonths(events: EventEntry[]): string[] {
  return [...new Set(events.map((event) => eventMonth(event.data.date)))].sort(
    (a, b) => b.localeCompare(a),
  );
}

export function groupByMonth(events: EventEntry[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const event of events) {
    const year = eventYear(event.data.date);
    const month = eventMonth(event.data.date);
    const key = `${year}-${month}`;
    const existing = groups.get(key);

    if (existing) {
      existing.events.push(event);
      continue;
    }

    groups.set(key, {
      key,
      heading: monthHeading(event.data.date),
      year,
      month,
      events: [event],
    });
  }

  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}
