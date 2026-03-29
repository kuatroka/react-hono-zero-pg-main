import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import packageJson from "../package.json" assert { type: "json" };
import * as buildCssScript from "./build-css";

const activeWatchers: Array<{ close: () => void }> = [];

afterEach(() => {
  while (activeWatchers.length > 0) {
    activeWatchers.pop()?.close();
  }

  mock.restore();
});

describe("build-css script", () => {
  test("package scripts expose explicit build and watch CSS commands", () => {
    const scripts = packageJson.scripts as Record<string, string>;

    expect(scripts["build:css"]).toBe("bun scripts/build-css.ts");
    expect(scripts["dev:css"]).toBe("bun run --watch scripts/build-css.ts --watch");
  });

  test("build script emits a root compiled stylesheet and tracks Tailwind inputs", () => {
    const source = readFileSync(join(import.meta.dir, "build-css.ts"), "utf8");

    expect(source).toContain('"index.compiled.css"');
    expect(source).toContain('"src"');
    expect(source).toContain('"index.html"');
    expect(source).toContain('"tailwind.config.js"');
    expect(source).toContain('"postcss.config.js"');
    expect(source).toContain('"components.json"');
  });

  test("watch mode uses recursive filesystem watchers across source and config inputs", async () => {
    const watchedTargets: string[] = [];
    const recursiveFlags: boolean[] = [];
    const fsWatchSpy = spyOn(buildCssScript.fs, "watch").mockImplementation((target, options, listener) => {
      watchedTargets.push(String(target));
      recursiveFlags.push(typeof options === "object" && options !== null && "recursive" in options && options.recursive === true);

      const callback = typeof options === "function" ? options : listener;
      callback?.("change", "src/index.css");

      return {
        close() {},
        on() {
          return this;
        },
        once() {
          return this;
        },
        emit() {
          return true;
        },
      } as unknown as ReturnType<typeof buildCssScript.fs.watch>;
    });

    const rebuildSpy = spyOn(buildCssScript, "buildCss").mockResolvedValue();

    const watcher = buildCssScript.startCssWatcher();
    activeWatchers.push(watcher);

    await new Promise((resolve) => setTimeout(resolve, 75));

    expect(fsWatchSpy).toHaveBeenCalled();
    expect(watchedTargets.some((target) => target.endsWith("/src"))).toBe(true);
    expect(watchedTargets.some((target) => target.endsWith("/index.html"))).toBe(true);
    expect(watchedTargets.some((target) => target.endsWith("/tailwind.config.js"))).toBe(true);
    expect(watchedTargets.some((target) => target.endsWith("/postcss.config.js"))).toBe(true);
    expect(watchedTargets.some((target) => target.endsWith("/components.json"))).toBe(true);
    expect(recursiveFlags.every(Boolean)).toBe(true);
    expect(rebuildSpy).toHaveBeenCalledTimes(1);
  });
});

