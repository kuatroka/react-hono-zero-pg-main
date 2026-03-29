import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import * as fs from "node:fs";
import path from "node:path";
import { buildCss } from "./build-css";

const repoRoot = path.resolve(import.meta.dir, "..");
const outdir = path.join(repoRoot, "dist");
const indexHtmlPath = path.join(repoRoot, "index.html");
const distIndexHtmlPath = path.join(outdir, "index.html");
const faviconSourcePath = path.join(repoRoot, "public", "favicon.ico");
const watchMode = process.argv.includes("--watch");

const watchTargets = [
  path.join(repoRoot, "src"),
  indexHtmlPath,
  faviconSourcePath,
  path.join(repoRoot, "tailwind.config.js"),
  path.join(repoRoot, "postcss.config.js"),
  path.join(repoRoot, "components.json"),
];

export async function buildApp() {
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
  await buildCss();

  const result = await Bun.build({
    entrypoints: [indexHtmlPath],
    outdir,
    root: repoRoot,
    target: "browser",
    sourcemap: "external",
    minify: false,
    tsconfig: path.join(repoRoot, "tsconfig.app.json"),
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    throw new Error("Bun build failed.");
  }

  const builtHtml = await readFile(distIndexHtmlPath, "utf8");
  const rootedHtml = builtHtml.replace(/href="\.\//g, 'href="/').replace(/src="\.\//g, 'src="/');

  await writeFile(distIndexHtmlPath, rootedHtml, "utf8");
  await copyFile(faviconSourcePath, path.join(outdir, "favicon.ico"));
}

export function startBuildWatcher() {
  let rebuildTimer: ReturnType<typeof setTimeout> | undefined;
  let buildInFlight = Promise.resolve();

  const scheduleBuild = () => {
    if (rebuildTimer) {
      clearTimeout(rebuildTimer);
    }

    rebuildTimer = setTimeout(() => {
      buildInFlight = buildInFlight
        .then(() => buildApp())
        .catch((error) => {
          console.error("Frontend rebuild failed", error);
        });
    }, 50);
  };

  const watchers = watchTargets.map((target) => fs.watch(target, { recursive: true }, scheduleBuild));

  return {
    close() {
      if (rebuildTimer) {
        clearTimeout(rebuildTimer);
      }
      for (const watcher of watchers) {
        watcher.close();
      }
    },
  };
}

async function main() {
  await buildApp();

  if (!watchMode) {
    return;
  }

  const watcher = startBuildWatcher();
  console.log("Frontend bundle watcher ready.");

  process.on("SIGINT", () => {
    watcher.close();
    process.exit(0);
  });
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Frontend build failed", error);
    process.exit(1);
  });
}
