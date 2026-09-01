import { z } from "zod";

const BundlePath = z
  .string()
  .min(1)
  .refine(
    (value) => {
      const normalized = value.replaceAll("\\", "/");
      return (
        !normalized.startsWith("/") &&
        !/^[a-zA-Z]:\//.test(normalized) &&
        !normalized.split("/").includes("..")
      );
    },
    "path must stay inside the event bundle",
  );

export const EventType = z.enum([
  "attendance",
  "talk",
  "workshop",
  "conference",
  "meetup",
  "article",
]);

export const EventStatus = z.enum(["draft", "published"]);

export const SpotlightCommunitySchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
  note: z.string().optional(),
});

export const SpotlightPersonSchema = z.object({
  name: z.string().min(1),
  role: z.enum(["organizer", "speaker", "community", "other"]).optional(),
  link: z.string().url(),
});

export const SpotlightSchema = z.object({
  topics: z.array(z.string()).default([]),
  communities: z.array(SpotlightCommunitySchema).default([]),
  people: z.array(SpotlightPersonSchema).default([]),
});

export const GalleryItemSchema = z.object({
  file: BundlePath,
  caption: z.string().optional(),
  alt: z.string().optional(),
});

export const EventManifestSchema = z.object({
  id: z
    .string()
    .regex(
      /^\d{4}-\d{2}-[a-z0-9-]+$/,
      "id must be YYYY-MM-slug (lowercase, hyphens)",
    ),
  title: z.string().min(1),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase with hyphens"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  type: EventType,
  status: EventStatus.default("draft"),
  series: z.string().optional(),
  venue: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  spotlight: SpotlightSchema.optional(),
  gallery: z.array(GalleryItemSchema).optional(),
  sources: z
    .object({
      notes: BundlePath.optional(),
      transcript: BundlePath.optional(),
      slides: BundlePath.optional(),
      images: BundlePath.optional(),
      urls: z.array(z.string().url()).optional(),
    })
    .optional(),
  links: z
    .object({
      event: z.string().url().optional(),
      slides: z.string().url().optional(),
      video: z.string().url().optional(),
      repo: z.string().url().optional(),
    })
    .optional(),
  published: z
    .object({
      post: BundlePath,
    })
    .optional(),
});

export type EventManifest = z.infer<typeof EventManifestSchema>;
export type EventType = z.infer<typeof EventType>;
export type EventStatus = z.infer<typeof EventStatus>;
export type GalleryItem = z.infer<typeof GalleryItemSchema>;
export type Spotlight = z.infer<typeof SpotlightSchema>;

export const EVENTS_DIR = "events";
export const PUBLISHED_POST = "published/post.mdx";
export const MANIFEST_FILE = "event.yaml";

export const EVENT_DIRS = ["sources", "drafts", "published"] as const;

export const SOURCE_SUBDIRS = ["slides", "images"] as const;

export const ATTENDANCE_POST_TEMPLATE = `## What this event was

<!-- 2–3 sentences about the event itself, not about you -->

## Topics covered

-

## Takeaways

<!-- One bullet per takeaway: what stuck with you, what surprised you -->

-
`;
