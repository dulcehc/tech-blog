import { Command } from "commander";
import {
  listEventDirectories,
  listEventBundles,
  loadEventBundle,
  resolvePaths,
  type EventBundle,
} from "./paths.js";
import { createEventBundle } from "./scaffold.js";
import { EventType } from "./schema.js";
import { syncAllEvents } from "./sync.js";
import {
  validateEventBundle,
  validateEventSet,
  validateManifestFile,
} from "./validate.js";

export function createCli(): Command {
  const program = new Command();

  program
    .name("chronicle")
    .description("Manage event bundles and sync published content to the site")
    .version("0.2.0");

  program
    .command("new")
    .description("Scaffold a new event bundle")
    .argument("<title>", "Event title")
    .option("--type <type>", "Event type (default: attendance)", "attendance")
    .option("--date <date>", "Event date (YYYY-MM-DD)")
    .option("--series <series>", "Optional series slug")
    .option("--venue <venue>", "Venue or host name")
    .option("--location <location>", "City or neighborhood")
    .action(
      async (
        title: string,
        opts: {
          type: string;
          date?: string;
          series?: string;
          venue?: string;
          location?: string;
        },
      ) => {
        const paths = resolvePaths();
        const { id, dir } = await createEventBundle({
          title,
          type: opts.type as EventType,
          date: opts.date,
          series: opts.series,
          venue: opts.venue,
          location: opts.location,
          eventsDir: paths.events,
        });
        console.log(`Created event: ${id}`);
        console.log(`  ${dir}`);
        console.log("\nNext steps:");
        console.log("  1. Add notes + slide photos to sources/");
        console.log("  2. List selected photos in gallery: in event.yaml");
        console.log("  3. Draft community spotlight in drafts/ (AI-assisted)");
        console.log("  4. Edit published/post.mdx + set summary in event.yaml");
        console.log('  5. Set status: published in event.yaml');
        console.log("  6. Run: pnpm chronicle sync");
      },
    );

  program
    .command("validate")
    .description("Validate event manifests and structure")
    .argument("[id]", "Optional event id to validate")
    .action(async (id?: string) => {
      const paths = resolvePaths();
      const directories = await listEventDirectories(paths.events);
      const candidates = id
        ? directories.filter((directory) => directory.id === id)
        : directories;

      if (id && candidates.length === 0) {
        console.log(`ERROR [${id}] Event directory not found`);
        process.exitCode = 1;
        return;
      }

      if (candidates.length === 0) {
        console.log("No event bundles found.");
        return;
      }

      let errors = 0;
      let warnings = 0;
      const validBundles: EventBundle[] = [];

      for (const candidate of candidates) {
        const manifestIssues = await validateManifestFile(candidate.manifestPath);
        const manifestHasErrors = manifestIssues.some(
          (issue) => issue.level === "error",
        );

        for (const issue of manifestIssues) {
          const prefix = issue.level === "error" ? "ERROR" : "WARN";
          console.log(`${prefix} [${issue.eventId}] ${issue.message}`);
          if (issue.level === "error") errors++;
          else warnings++;
        }

        if (manifestHasErrors) continue;

        const bundle = await loadEventBundle(paths.events, candidate.id);
        validBundles.push(bundle);
        const structureIssues = await validateEventBundle(bundle);
        for (const issue of structureIssues) {
          const prefix = issue.level === "error" ? "ERROR" : "WARN";
          console.log(`${prefix} [${issue.eventId}] ${issue.message}`);
          if (issue.level === "error") errors++;
          else warnings++;
        }
      }

      for (const issue of validateEventSet(validBundles)) {
        console.log(`ERROR [${issue.eventId}] ${issue.message}`);
        errors++;
      }

      if (errors > 0) {
        process.exitCode = 1;
        console.log(`\nValidation failed: ${errors} error(s), ${warnings} warn(s)`);
      } else {
        console.log(`\nValidation passed: ${warnings} warning(s)`);
      }
    });

  program
    .command("sync")
    .description("Sync published events to the Astro content directory")
    .action(async () => {
      const paths = resolvePaths();
      const bundles = await listEventBundles(paths.events);
      const results = await syncAllEvents(bundles, {
        siteContent: paths.siteContent,
        sitePublicEvents: paths.sitePublicEvents,
      });

      for (const result of results) {
        if (result.action === "synced") {
          const gallery =
            result.galleryCount !== undefined
              ? `, ${result.galleryCount} photo(s)`
              : "";
          console.log(`SYNC  [${result.id}] → ${result.outputPath}${gallery}`);
        } else {
          console.log(`SKIP  [${result.id}] (${result.reason})`);
        }
      }

      const synced = results.filter((r) => r.action === "synced").length;
      console.log(`\nSynced ${synced} of ${results.length} event(s).`);
    });

  program
    .command("list")
    .description("List event bundles")
    .action(async () => {
      const paths = resolvePaths();
      const bundles = await listEventBundles(paths.events);

      if (bundles.length === 0) {
        console.log('No events yet. Run: pnpm chronicle new "WomenCon 2026"');
        return;
      }

      for (const { manifest } of bundles) {
        const series = manifest.series ? ` [${manifest.series}]` : "";
        console.log(
          `${manifest.status.padEnd(9)} ${manifest.id}  ${manifest.title}${series}`,
        );
      }
    });

  return program;
}
