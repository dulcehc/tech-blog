import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { EventBundle } from "./paths.js";
import { GalleryItem, PUBLISHED_POST } from "./schema.js";

export interface SyncResult {
  id: string;
  action: "synced" | "skipped";
  reason?: string;
  outputPath?: string;
  galleryCount?: number;
}

export interface SyncedGalleryItem {
  src: string;
  caption?: string;
  alt?: string;
}

export interface SyncTargetDirs {
  siteContent: string;
  sitePublicEvents: string;
}

export async function syncEventBundle(
  bundle: EventBundle,
  dirs: SyncTargetDirs,
): Promise<SyncResult> {
  const { manifest, dir } = bundle;

  if (manifest.status !== "published") {
    return {
      id: manifest.id,
      action: "skipped",
      reason: `status is "${manifest.status}"`,
    };
  }

  const postRel = manifest.published?.post ?? PUBLISHED_POST;
  const postPath = path.join(dir, postRel);

  let postContent: string;
  try {
    postContent = await readFile(postPath, "utf8");
  } catch {
    return {
      id: manifest.id,
      action: "skipped",
      reason: `missing published post at ${postRel}`,
    };
  }

  const parsed = matter(postContent);
  const gallery = await syncGallery(
    manifest.gallery ?? [],
    dir,
    manifest.slug,
    dirs.sitePublicEvents,
  );
  const mergedFrontmatter = {
    ...parsed.data,
    ...manifestToFrontmatter(manifest),
    gallery,
  };

  const outputDir = path.join(dirs.siteContent, manifest.slug);
  await mkdir(outputDir, { recursive: true });

  const outputPost = path.join(outputDir, "index.mdx");
  const output = matter.stringify(parsed.content, mergedFrontmatter);
  await writeFile(outputPost, output, "utf8");

  return {
    id: manifest.id,
    action: "synced",
    outputPath: outputPost,
    galleryCount: gallery.length,
  };
}

function manifestToFrontmatter(manifest: EventBundle["manifest"]) {
  const frontmatter = {
    title: manifest.title,
    summary: manifest.summary ?? manifest.description ?? "",
    description: manifest.description ?? manifest.summary ?? "",
    date: manifest.date,
    eventId: manifest.id,
    type: manifest.type,
    series: manifest.series,
    venue: manifest.venue,
    location: manifest.location,
    tags: manifest.tags,
    spotlight: manifest.spotlight,
    links: manifest.links,
    draft: false,
  };

  return Object.fromEntries(
    Object.entries(frontmatter).filter(([, value]) => value !== undefined),
  );
}

async function syncGallery(
  items: GalleryItem[],
  eventDir: string,
  slug: string,
  sitePublicEventsDir: string,
): Promise<SyncedGalleryItem[]> {
  if (items.length === 0) return [];

  const outputDir = path.join(sitePublicEventsDir, slug, "gallery");
  await mkdir(outputDir, { recursive: true });

  const synced: SyncedGalleryItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const sourcePath = path.join(eventDir, item.file);
    const ext = path.extname(item.file) || ".jpg";
    const outputName = `${String(i + 1).padStart(2, "0")}${ext}`;
    const outputPath = path.join(outputDir, outputName);
    await copyFile(sourcePath, outputPath);

    synced.push({
      src: `events/${slug}/gallery/${outputName}`,
      caption: item.caption,
      alt: item.alt ?? item.caption ?? `Photo ${i + 1}`,
    });
  }

  return synced;
}

export async function syncAllEvents(
  bundles: EventBundle[],
  dirs: SyncTargetDirs,
): Promise<SyncResult[]> {
  await Promise.all([
    resetSyncTarget(dirs.siteContent),
    resetSyncTarget(dirs.sitePublicEvents),
  ]);

  const results: SyncResult[] = [];
  for (const bundle of bundles) {
    results.push(await syncEventBundle(bundle, dirs));
  }
  return results;
}

async function resetSyncTarget(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, ".gitkeep"), "", "utf8");
}
