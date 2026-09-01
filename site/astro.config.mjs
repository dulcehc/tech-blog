import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import {
  resolveGithubPagesBase,
  resolveGithubPagesSiteUrl,
} from "./github-pages.mjs";

const base = resolveGithubPagesBase();
const site = resolveGithubPagesSiteUrl();

export default defineConfig({
  site,
  base,
  integrations: [mdx(), ...(site ? [sitemap()] : [])],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
});
