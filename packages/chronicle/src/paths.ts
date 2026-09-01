import { statSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  EVENTS_DIR,
  EventManifest,
  EventManifestSchema,
  MANIFEST_FILE,
} from "./schema.js";

export interface EventBundle {
  dir: string;
  manifestPath: string;
  manifest: EventManifest;
}

export interface EventDirectory {
  id: string;
  dir: string;
  manifestPath: string;
}

export interface ChroniclePaths {
  root: string;
  events: string;
  siteContent: string;
  sitePublicEvents: string;
}

export function resolvePaths(cwd = process.cwd()): ChroniclePaths {
  const root = findProjectRoot(cwd);
  return {
    root,
    events: path.join(root, EVENTS_DIR),
    siteContent: path.join(root, "site", "src", "content", "events"),
    sitePublicEvents: path.join(root, "site", "public", "events"),
  };
}

function findProjectRoot(start: string): string {
  let current = start;
  while (true) {
    const eventsPath = path.join(current, EVENTS_DIR);
    try {
      if (statSyncIsDirectory(eventsPath)) {
        return current;
      }
    } catch {
      // continue upward
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return start;
    }
    current = parent;
  }
}

function statSyncIsDirectory(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export async function listEventBundles(
  eventsDir: string,
): Promise<EventBundle[]> {
  const directories = await listEventDirectories(eventsDir);
  const bundles: EventBundle[] = [];

  for (const { dir, manifestPath } of directories) {
    try {
      const raw = await readFile(manifestPath, "utf8");
      const parsed = parseYaml(raw);
      const manifest = EventManifestSchema.parse(parsed);
      bundles.push({ dir, manifestPath, manifest });
    } catch {
      // Validation reports malformed and missing manifests separately.
    }
  }

  return bundles;
}

export async function listEventDirectories(
  eventsDir: string,
): Promise<EventDirectory[]> {
  let entries: string[];
  try {
    entries = await readdir(eventsDir);
  } catch {
    return [];
  }

  const directories: EventDirectory[] = [];
  for (const entry of entries.sort()) {
    const dir = path.join(eventsDir, entry);
    let info;
    try {
      info = await stat(dir);
    } catch {
      continue;
    }
    if (!info.isDirectory()) continue;

    directories.push({
      id: entry,
      dir,
      manifestPath: path.join(dir, MANIFEST_FILE),
    });
  }

  return directories;
}

export async function loadEventBundle(
  eventsDir: string,
  id: string,
): Promise<EventBundle> {
  const dir = path.join(eventsDir, id);
  const manifestPath = path.join(dir, MANIFEST_FILE);
  const raw = await readFile(manifestPath, "utf8");
  const parsed = parseYaml(raw);
  const manifest = EventManifestSchema.parse(parsed);
  return { dir, manifestPath, manifest };
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function makeEventId(title: string, date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-${slugify(title)}`;
}
