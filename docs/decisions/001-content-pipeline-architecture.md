# ADR-001: Filesystem Event Bundles with Chronicle Engine and Astro Site

## Status

Accepted

## Date

2026-08-30

## Context

This project publishes write-ups of talks, workshops, and other events. Each event has heterogeneous source material (notes, transcripts, images, links) that may be refined by AI into human-edited published posts.

Requirements for V1:

- Simple to maintain and extend
- Excellent static output
- Low friction to add a new event
- Clear separation between source material and published content
- Architecture that can later extract a reusable open-source tool without premature abstraction

## Decision

Use a **filesystem-based event bundle model** with three layers:

1. **`events/`** — personal source bundles (manifest + sources + drafts + published)
2. **`packages/chronicle/`** — reusable engine (schema, validation, scaffolding, sync)
3. **`site/`** — personal Astro static site consuming synced published content

AI drafting happens **outside** the build pipeline (Cursor/agent session). Generated drafts are stored in `drafts/` for review. Only human-approved content in `published/` is synced to the site.

## Alternatives Considered

### Markdown-only static site (posts live in `content/`)

- Pros: Simplest possible setup; no sync step
- Cons: No place for raw transcripts, notes, or draft iterations; source and published content get mixed
- Rejected: Violates source/published separation requirement

### Headless CMS (Sanity, Contentful, Decourse)

- Pros: Rich editing UI, media management, collaboration
- Cons: Operational overhead, vendor coupling, poor fit for git-native source material and AI draft workflow
- Rejected: Over-engineered for a personal V1

### AI generation on every build

- Pros: Always "fresh" output
- Cons: Non-deterministic, costly, breaks reproducible builds, unsuitable for git-based publishing
- Rejected: Generated content must be stored and reviewed, not computed at deploy time

### Obsidian / Quartz / PKM pipeline

- Pros: Excellent for personal notes; mature markdown ecosystem
- Cons: Optimized for daily notes and graph navigation, not event-centric publishing with typed metadata and sync to a branded site
- Rejected: Wrong primary abstraction; would fight the event model

### Contentlayer / Velite as the engine

- Pros: Type-safe content collections from filesystem
- Cons: Contentlayer is unmaintained; both assume published content lives in the content directory already — they don't model source bundles or a sync boundary
- Rejected: Astro native content collections are sufficient for the site layer

### Full monorepo CLI with plugin system on day one

- Pros: Maximum extensibility for PDF/audio/URL sources
- Cons: Premature abstraction before one event ships end-to-end
- Rejected for V1: Extension points are documented; plugins come when a second source type is actually needed

## Consequences

- Adding an event: `pnpm chronicle new "Title"` → drop sources → draft with AI in Cursor → edit → set `status: published` → `pnpm chronicle sync` → `pnpm build`
- Source material stays in git (or can be gitignored selectively later for large assets)
- The site never reads from `events/` directly — only from synced `site/src/content/events/`
- Extracting `chronicle` as OSS later requires moving `packages/chronicle/` to its own repo; the site and `events/` stay personal

## Content Model

Each event is a directory keyed by `YYYY-MM-slug/` containing:

| Path | Purpose | Synced to site? |
|------|---------|-----------------|
| `event.yaml` | Canonical metadata manifest | Merged into frontmatter |
| `sources/` | Raw inputs (notes, transcript, images) | No |
| `drafts/` | AI-generated drafts awaiting review | No |
| `published/` | Human-approved post + assets | Yes |

## AI Boundaries

**AI should:** summarize transcripts, propose structure, draft prose from sources, suggest titles/tags, extract quotes and key points.

**AI should NOT:** auto-publish, overwrite `published/` without human review, or run during CI/build.

## Evolution Path

| Phase | Scope |
|-------|-------|
| V1 (now) | Event bundles, chronicle CLI, Astro site, manual AI drafting |
| V2 | Source adapters (URL fetch, PDF text extract), `chronicle import` |
| V3 | Extract `@chronicle/core` npm package; GitHub template repo |
| V4 | Optional web UI for non-CLI users |
