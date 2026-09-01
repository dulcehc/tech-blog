import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const spotlightSchema = z
  .object({
    topics: z.array(z.string()).default([]),
    communities: z
      .array(
        z.object({
          name: z.string(),
          url: z.string().url().optional(),
          note: z.string().optional(),
        }),
      )
      .default([]),
    people: z
      .array(
        z.object({
          name: z.string(),
          role: z
            .enum(["organizer", "speaker", "community", "other"])
            .optional(),
          link: z.string().url(),
        }),
      )
      .default([]),
  })
  .optional();

const gallerySchema = z
  .array(
    z.object({
      src: z.string(),
      caption: z.string().optional(),
      alt: z.string().optional(),
    }),
  )
  .default([]);

const events = defineCollection({
  loader: glob({ base: "./src/content/events", pattern: "**/index.mdx" }),
  schema: z.object({
    title: z.string(),
    summary: z.string().default(""),
    description: z.string().default(""),
    date: z.string(),
    eventId: z.string(),
    type: z.enum([
      "attendance",
      "talk",
      "workshop",
      "conference",
      "meetup",
      "article",
    ]),
    series: z.string().optional(),
    venue: z.string().optional(),
    location: z.string().optional(),
    tags: z.array(z.string()).default([]),
    spotlight: spotlightSchema,
    gallery: gallerySchema,
    links: z
      .object({
        event: z.string().url().optional(),
        slides: z.string().url().optional(),
        video: z.string().url().optional(),
        repo: z.string().url().optional(),
      })
      .optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { events };
