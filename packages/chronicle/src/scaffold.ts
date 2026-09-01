import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { makeEventId } from "./paths.js";
import {
  ATTENDANCE_POST_TEMPLATE,
  EVENT_DIRS,
  EventManifest,
  EventType,
  MANIFEST_FILE,
  PUBLISHED_POST,
  SOURCE_SUBDIRS,
} from "./schema.js";

export interface NewEventOptions {
  title: string;
  type?: EventType;
  date?: string;
  series?: string;
  venue?: string;
  location?: string;
  eventsDir: string;
}

export async function createEventBundle(
  options: NewEventOptions,
): Promise<{ id: string; dir: string }> {
  const date = options.date
    ? new Date(`${options.date}T12:00:00`)
    : new Date();
  const id = makeEventId(options.title, date);
  const dir = path.join(options.eventsDir, id);

  try {
    await access(dir);
    throw new Error(`Event already exists: ${id}`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Event already")) {
      throw err;
    }
  }

  await mkdir(dir, { recursive: true });
  for (const sub of EVENT_DIRS) {
    await mkdir(path.join(dir, sub), { recursive: true });
  }
  for (const sub of SOURCE_SUBDIRS) {
    await mkdir(path.join(dir, "sources", sub), { recursive: true });
  }
  await mkdir(path.join(dir, "published", "gallery"), { recursive: true });

  const dateStr = options.date ?? formatDate(date);
  const slug = id.replace(/^\d{4}-\d{2}-/, "");
  const type = options.type ?? "attendance";

  const manifest: EventManifest = {
    id,
    title: options.title,
    slug,
    date: dateStr,
    type,
    status: "draft",
    series: options.series,
    venue: options.venue,
    location: options.location,
    tags: [],
    spotlight: {
      topics: [],
      communities: [],
      people: [],
    },
    gallery: [],
    sources: {
      notes: "sources/notes.md",
      slides: "sources/slides/",
    },
    published: {
      post: PUBLISHED_POST,
    },
  };

  await writeFile(
    path.join(dir, MANIFEST_FILE),
    stringifyYaml(manifest),
    "utf8",
  );

  await writeFile(
    path.join(dir, "sources", "notes.md"),
    `# ${options.title} — Notes\n\n<!-- Bullet fragments: names, URLs, impressions -->\n\n`,
    "utf8",
  );

  await writeFile(
    path.join(dir, "sources", "slides", ".gitkeep"),
    "",
    "utf8",
  );

  await writeFile(
    path.join(dir, "drafts", "post.md"),
    `<!-- AI community spotlight draft. Tone: highlight the ecosystem, not yourself. -->\n`,
    "utf8",
  );

  const postTemplate =
    type === "attendance" ? ATTENDANCE_POST_TEMPLATE : "<!-- Human-edited published post -->\n";

  await writeFile(
    path.join(dir, PUBLISHED_POST),
    postTemplate,
    "utf8",
  );

  return { id, dir };
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
