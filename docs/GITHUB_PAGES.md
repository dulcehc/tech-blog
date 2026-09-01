# GitHub Pages deploy

Everything GitHub needs is **committed in `events/`**. The workflow runs the same build you run locally — no manual upload of `site/dist/`.

## How it works

```
YOU COMMIT TO GIT                    GITHUB ACTIONS (on push to main)
─────────────────                    ────────────────────────────────
events/
  └── 2026-08-my-event/
      ├── event.yaml        ───┐
      ├── sources/notes.md       │
      └── published/
          ├── post.mdx           ├──►  pnpm site:publish
          └── gallery/*.jpg  ───┘         │
                                          ├─ chronicle sync → site/src/content/
                                          └─ astro build    → site/dist/
                                                    │
                                                    ▼
                                          deploy site/dist/ to Pages
```

**You do not commit** `site/src/content/events/` or `site/dist/` — they are generated during build.

**You do commit** gallery images under `published/gallery/` (not raw dumps in `sources/slides/`).

---

## One-time GitHub setup

1. Push this repo to GitHub
2. **Settings → Pages → Build and deployment**
   - Source: **GitHub Actions** (not “Deploy from branch”)
3. Push to `main` — workflow runs automatically

### Your URL

| Repo name | Live URL |
|-----------|----------|
| `blog` | `https://YOUR_USER.github.io/blog/` |
| `YOUR_USER.github.io` | `https://YOUR_USER.github.io/` |

---

## Before every push

```bash
pnpm site:publish
```

This command:

1. Builds the chronicle CLI
2. Validates manifests (warns if gallery points at gitignored `sources/` paths)
3. Syncs published events → `site/src/content/events/` (with gallery images)
4. Builds static site → `site/dist/`

If it passes locally, CI will pass. Then:

```bash
git add events/
git commit -m "Add WomenCon event notes"
git push
```

---

## Images on GitHub Pages

| Path | In git? | On live site? |
|------|---------|---------------|
| `published/post.mdx` | Yes | Yes |
| `published/gallery/*.jpg` | Yes | Yes (if in `gallery` list) |
| `sources/slides/*` | No | No |

```yaml
# event.yaml — only list committed photos
gallery:
  - file: published/gallery/womencon-swag.jpg
    caption: "WomenCon shirt, badge, pins, and lanyard"
```

Copy selected photos from `sources/slides/` → `published/gallery/` before committing.

---

## Optional: Mixpanel in CI

**Settings → Secrets and variables → Actions:**

| Secret | Value |
|--------|-------|
| `PUBLIC_MIXPANEL_TOKEN` | Mixpanel project token |
| `PUBLIC_SITE_URL` | e.g. `https://you.github.io/blog/` |

If unset, the site builds without analytics.

---

## Troubleshooting

**404 on assets / broken CSS** — repo name must match Astro `base` path. The build sets this from `GITHUB_REPOSITORY` automatically in CI. Locally, set `BASE_PATH=/your-repo-name/` if previewing GitHub Pages layout:

```bash
BASE_PATH=/blog/ GITHUB_REPOSITORY=you/blog pnpm site:publish
pnpm preview
```

**Gallery empty on live site** — photos likely still in `sources/slides/` only. Move to `published/gallery/` and commit.
