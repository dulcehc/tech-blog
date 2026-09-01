# CDMX Tech Journal

A community-focused journal of technology and AI events in Mexico City. Each entry
captures the topics, communities, people, photos, and takeaways worth remembering.

The project is a pnpm workspace with a custom content tool and an Astro static site:

- `events/` is the source of truth for event metadata, writing, and selected photos.
- `packages/chronicle/` validates event bundles and syncs published content.
- `site/` renders the synced content as a static Astro site.

## Requirements

- Node.js 22.12 or newer
- pnpm 10

## Local development

```bash
pnpm install
pnpm dev
```

The development command builds Chronicle, syncs published content, and starts
the Astro server.

## Commands

- `pnpm dev`: sync content and start the Astro development server
- `pnpm site:publish`: build Chronicle, validate, sync, and build the site
- `pnpm chronicle list`: list event bundles
- `pnpm chronicle validate`: validate discovered event bundles and gallery files
- `pnpm chronicle sync`: copy published event content into the Astro site
- `pnpm test`: run Chronicle regression tests
- `pnpm preview`: preview the latest production build

## Add an event

```bash
pnpm chronicle new "WomenCon 2026" \
  --series cdmx-tech-summer-2026 \
  --date 2026-07-25 \
  --venue "IQsec" \
  --location "Ciudad de México"
```

1. Add bullet notes to `sources/notes.md`
2. Keep raw photos in `sources/slides/`
3. Copy selected photos to `published/gallery/`
4. List those photos under `gallery` in `event.yaml`
5. Add topics, communities, and people under `spotlight`
6. Write and review `published/post.mdx`
7. Add a short `summary` and set `status: published`
8. Run `pnpm site:publish`

## Gallery

Only gallery files listed in `event.yaml` appear on the site:

```yaml
gallery:
  - file: published/gallery/womencon-swag.jpg
    caption: "WomenCon shirt, badge, pins, and lanyard"
```

Use files under `published/gallery/` for deployment. Raw files under
`sources/slides/` and drafts under `drafts/` are ignored by git.

## Content pipeline

1. Chronicle reads and validates each `events/*/event.yaml`.
2. Published MDX is merged with event metadata.
3. Selected images are copied to `site/public/events/`.
4. Generated content is written to `site/src/content/events/`.
5. Astro builds the deployable static site in `site/dist/`.

Sync clears and regenerates its managed output so removed or unpublished events
do not leave stale pages or images. Generated site content and build output are
not committed. See the
[content pipeline decision](docs/decisions/001-content-pipeline-architecture.md)
for the design rationale.

## Deployment

The production artifact is `site/dist/`. Pushes to `main` run tests, build the
site, and deploy it through GitHub Actions after Pages is configured for
**GitHub Actions** in the repository settings.

For setup and base-path details, see the
[GitHub Pages guide](docs/GITHUB_PAGES.md). For other static hosts and optional
analytics, see the [publishing guide](docs/PUBLISHING.md).

Before every deployment, run:

```bash
pnpm site:publish
```
