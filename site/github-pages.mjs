/**
 * GitHub Pages base path and site URL.
 * - user.github.io repo → base /
 * - project repo "blog" → base /blog/
 */
export function resolveGithubPagesBase() {
  if (process.env.BASE_PATH) {
    return ensureTrailingSlash(process.env.BASE_PATH);
  }

  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  if (!repo) return "/";
  if (repo.endsWith(".github.io")) return "/";
  return `/${repo}/`;
}

export function resolveGithubPagesSiteUrl() {
  if (process.env.PUBLIC_SITE_URL) {
    return process.env.PUBLIC_SITE_URL.replace(/\/?$/, "/");
  }

  const [owner, repo] = process.env.GITHUB_REPOSITORY?.split("/") ?? [];
  if (!owner || !repo) return undefined;

  if (repo.endsWith(".github.io")) {
    return `https://${repo}/`;
  }

  return `https://${owner}.github.io/${repo}/`;
}

function ensureTrailingSlash(path) {
  if (path === "/") return "/";
  return path.endsWith("/") ? path : `${path}/`;
}
