import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import { listEventDirectories, type EventBundle } from "./paths.js";
import { createEventBundle } from "./scaffold.js";
import { EventManifestSchema } from "./schema.js";
import { syncAllEvents } from "./sync.js";
import { validateEventSet } from "./validate.js";

test("event discovery includes directories with invalid or missing manifests", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "chronicle-discovery-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  await mkdir(path.join(root, "valid-event"));
  await mkdir(path.join(root, "invalid-event"));
  await mkdir(path.join(root, "missing-event"));
  await writeFile(path.join(root, "valid-event", "event.yaml"), "id: valid\n");
  await writeFile(path.join(root, "invalid-event", "event.yaml"), ":\n invalid");

  const candidates = await listEventDirectories(root);

  assert.deepEqual(
    candidates.map(({ id }) => id),
    ["invalid-event", "missing-event", "valid-event"],
  );
});

test("sync removes stale output and keeps manifest metadata authoritative", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "chronicle-sync-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const eventDir = path.join(root, "events", "2026-08-example");
  const siteContent = path.join(root, "site-content");
  const sitePublicEvents = path.join(root, "site-public");
  await mkdir(path.join(eventDir, "published"), { recursive: true });
  await mkdir(path.join(siteContent, "stale-event"), { recursive: true });
  await mkdir(path.join(sitePublicEvents, "stale-event"), { recursive: true });
  await writeFile(path.join(siteContent, "stale-event", "index.mdx"), "stale");
  await writeFile(path.join(sitePublicEvents, "stale-event", "photo.jpg"), "stale");
  await writeFile(
    path.join(eventDir, "published", "post.mdx"),
    "---\ntitle: Wrong title\ndraft: true\n---\n\nPost body\n",
  );

  const manifest = EventManifestSchema.parse({
    id: "2026-08-example",
    title: "Canonical title",
    slug: "example",
    date: "2026-08-01",
    type: "attendance",
    status: "published",
    tags: [],
    gallery: [],
    published: { post: "published/post.mdx" },
  });
  const bundle: EventBundle = {
    dir: eventDir,
    manifestPath: path.join(eventDir, "event.yaml"),
    manifest,
  };

  await syncAllEvents([bundle], { siteContent, sitePublicEvents });

  await assert.rejects(access(path.join(siteContent, "stale-event")));
  await assert.rejects(access(path.join(sitePublicEvents, "stale-event")));
  const output = matter(
    await readFile(path.join(siteContent, "example", "index.mdx"), "utf8"),
  );
  assert.equal(output.data.title, "Canonical title");
  assert.equal(output.data.draft, false);
});

test("manifest schema rejects paths that escape an event bundle", () => {
  const result = EventManifestSchema.safeParse({
    id: "2026-08-example",
    title: "Example",
    slug: "example",
    date: "2026-08-01",
    type: "attendance",
    status: "published",
    tags: [],
    gallery: [{ file: "../../private.jpg" }],
    published: { post: "/tmp/post.mdx" },
  });

  assert.equal(result.success, false);
});

test("event-set validation rejects duplicate output slugs", () => {
  const makeBundle = (id: string): EventBundle => ({
    dir: `/events/${id}`,
    manifestPath: `/events/${id}/event.yaml`,
    manifest: EventManifestSchema.parse({
      id,
      title: id,
      slug: "same-output",
      date: "2026-08-01",
      type: "attendance",
      status: "published",
      tags: [],
    }),
  });

  const issues = validateEventSet([
    makeBundle("2026-08-first"),
    makeBundle("2026-08-second"),
  ]);

  assert.equal(issues.length, 2);
  assert.match(issues[0].message, /duplicate slug "same-output"/);
});

test("new event posts contain body content only", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "chronicle-scaffold-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const { dir } = await createEventBundle({
    title: "Example Event",
    date: "2026-08-01",
    eventsDir: root,
  });
  const post = await readFile(path.join(dir, "published", "post.mdx"), "utf8");

  assert.equal(post.startsWith("---"), false);
  assert.match(post, /^## What this event was/);
});

test("sync fails instead of publishing a partial gallery", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "chronicle-missing-gallery-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const eventDir = path.join(root, "events", "2026-08-example");
  await mkdir(path.join(eventDir, "published"), { recursive: true });
  await writeFile(path.join(eventDir, "published", "post.mdx"), "Post body\n");

  const bundle: EventBundle = {
    dir: eventDir,
    manifestPath: path.join(eventDir, "event.yaml"),
    manifest: EventManifestSchema.parse({
      id: "2026-08-example",
      title: "Example",
      slug: "example",
      date: "2026-08-01",
      type: "attendance",
      status: "published",
      tags: [],
      gallery: [{ file: "published/missing.jpg" }],
    }),
  };

  await assert.rejects(
    syncAllEvents([bundle], {
      siteContent: path.join(root, "site-content"),
      sitePublicEvents: path.join(root, "site-public"),
    }),
    /ENOENT/,
  );
});
