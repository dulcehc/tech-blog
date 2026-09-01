import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { ZodError } from "zod";
import { EventBundle } from "./paths.js";
import {
  EventManifestSchema,
  MANIFEST_FILE,
  PUBLISHED_POST,
} from "./schema.js";

export interface ValidationIssue {
  eventId: string;
  level: "error" | "warn";
  message: string;
}

export function validateEventSet(
  bundles: EventBundle[],
): ValidationIssue[] {
  const bySlug = new Map<string, EventBundle[]>();

  for (const bundle of bundles) {
    const matches = bySlug.get(bundle.manifest.slug) ?? [];
    matches.push(bundle);
    bySlug.set(bundle.manifest.slug, matches);
  }

  const issues: ValidationIssue[] = [];
  for (const [slug, matches] of bySlug) {
    if (matches.length < 2) continue;

    for (const bundle of matches) {
      issues.push({
        eventId: bundle.manifest.id,
        level: "error",
        message: `duplicate slug "${slug}" also used by ${matches
          .filter((match) => match.manifest.id !== bundle.manifest.id)
          .map((match) => match.manifest.id)
          .join(", ")}`,
      });
    }
  }

  return issues;
}

export async function validateEventBundle(
  bundle: EventBundle,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const { manifest, dir } = bundle;

  if (path.basename(dir) !== manifest.id) {
    issues.push({
      eventId: manifest.id,
      level: "error",
      message: `Directory name "${path.basename(dir)}" must match manifest id "${manifest.id}"`,
    });
  }

  if (manifest.slug !== manifest.id.replace(/^\d{4}-\d{2}-/, "")) {
    issues.push({
      eventId: manifest.id,
      level: "warn",
      message: `slug "${manifest.slug}" does not match id suffix`,
    });
  }

  if (manifest.sources?.notes) {
    await checkFile(manifest.id, manifest.sources.notes, dir, issues);
  }
  if (manifest.sources?.transcript) {
    await checkFile(manifest.id, manifest.sources.transcript, dir, issues);
  }

  if (manifest.status === "published") {
    const postRel = manifest.published?.post ?? PUBLISHED_POST;
    const exists = await fileExists(path.join(dir, postRel));
    if (!exists) {
      issues.push({
        eventId: manifest.id,
        level: "error",
        message: `Published status requires post at ${postRel}`,
      });
    }

    if (!manifest.summary && !manifest.description) {
      issues.push({
        eventId: manifest.id,
        level: "warn",
        message: "Add summary (card text) or description before publishing",
      });
    }

    for (const item of manifest.gallery ?? []) {
      const galleryPath = path.join(dir, item.file);
      const exists = await fileExists(galleryPath);
      if (!exists) {
        issues.push({
          eventId: manifest.id,
          level: "error",
          message: `Gallery file missing: ${item.file}`,
        });
      } else if (item.file.startsWith("sources/")) {
        issues.push({
          eventId: manifest.id,
          level: "warn",
          message: `Gallery uses ${item.file} — copy to published/gallery/ for GitHub Pages deploy`,
        });
      }
    }

  }

  return issues;
}

export async function validateManifestFile(
  manifestPath: string,
): Promise<ValidationIssue[]> {
  const eventId = path.basename(path.dirname(manifestPath));
  try {
    const raw = await readFile(manifestPath, "utf8");
    EventManifestSchema.parse(parseYaml(raw));
    return [];
  } catch (err) {
    if (err instanceof ZodError) {
      return err.issues.map((issue) => ({
        eventId,
        level: "error" as const,
        message: `${issue.path.join(".")}: ${issue.message}`,
      }));
    }
    return [
      {
        eventId,
        level: "error",
        message: err instanceof Error ? err.message : "Invalid manifest",
      },
    ];
  }
}

async function checkFile(
  eventId: string,
  rel: string,
  dir: string,
  issues: ValidationIssue[],
): Promise<void> {
  if (rel.endsWith("/")) return;
  const exists = await fileExists(path.join(dir, rel));
  if (!exists) {
    issues.push({
      eventId,
      level: "warn",
      message: `Referenced source missing: ${rel}`,
    });
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
