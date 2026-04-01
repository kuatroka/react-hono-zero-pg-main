import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import postcssConfig from "../postcss.config.js";

const projectRoot = path.resolve(import.meta.dir, "..");
const inputPath = path.join(projectRoot, "src", "index.css");
const outputPath = path.join(projectRoot, "index.compiled.css");
const watchMode = process.argv.includes("--watch");
const watchTargets = [
  path.join(projectRoot, "src"),
  path.join(projectRoot, "index.html"),
  path.join(projectRoot, "tailwind.config.js"),
  path.join(projectRoot, "postcss.config.js"),
  path.join(projectRoot, "components.json"),
];

export { fs };

async function loadPostcssPlugin(pluginName: string) {
  const importedPlugin = await import(pluginName);
  return importedPlugin.default ?? importedPlugin;
}

export async function buildCss() {
  const source = await readFile(inputPath, "utf8");
  const plugins = await Promise.all(
    Object.entries(postcssConfig.plugins ?? {}).map(async ([pluginName, options]) => {
      const plugin = await loadPostcssPlugin(pluginName);
      return plugin(options);
    }),
  );

  const result = await postcss(plugins).process(source, {
    from: inputPath,
    to: outputPath,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, result.css, "utf8");
}

export function startCssWatcher() {
  let rebuildTimer: ReturnType<typeof setTimeout> | undefined;

  const scheduleBuild = (filename?: string | null) => {
    if (filename?.endsWith("index.compiled.css")) {
      return;
    }

    if (rebuildTimer) {
      clearTimeout(rebuildTimer);
    }

    rebuildTimer = setTimeout(() => {
      buildCss().catch((error) => {
        console.error("CSS rebuild failed", error);
      });
    }, 50);
  };

  const watchers = watchTargets.map((target) => fs.watch(target, { recursive: true }, (_eventType, filename) => scheduleBuild(filename)));

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
  await buildCss();

  if (!watchMode) {
    return;
  }

  const watcher = startCssWatcher();

  process.on("SIGINT", () => {
    watcher.close();
    process.exit(0);
  });
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("CSS build failed", error);
    process.exit(1);
  });
}

