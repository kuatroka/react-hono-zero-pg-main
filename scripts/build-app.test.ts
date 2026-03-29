import { describe, expect, test } from "bun:test";
import packageJson from "../package.json" assert { type: "json" };
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

const buildAppSource = readFileSync(path.join(import.meta.dir, "build-app.ts"), "utf8");
const repoRoot = path.join(import.meta.dir, "..");
const distDir = path.join(repoRoot, "dist");

describe("production build script", () => {
  test("build script uses Bun bundling instead of Vite", () => {
    const scripts = packageJson.scripts as Record<string, string>;

    expect(scripts.build).not.toContain("vite");
    expect(scripts.build).toContain("bun run build:css");
    expect(scripts.build).toContain("scripts/build-app.ts");
  });

  test("build script bundles the html entrypoint and roots emitted asset links", () => {
    expect(buildAppSource).toContain("entrypoints: [indexHtmlPath]");
    expect(buildAppSource).toContain("const distIndexHtmlPath = path.join(outdir, \"index.html\")");
    expect(buildAppSource).not.toContain("const jsCssAssets = result.outputs");
    expect(buildAppSource).not.toContain("cssAssets.map");
    expect(buildAppSource).toContain('.replace(/href="\\.\\//g, \'href="/\')');
    expect(buildAppSource).toContain('.replace(/src="\\.\\//g, \'src="/\')');
    expect(buildAppSource).toContain("export function startBuildWatcher()");
    expect(buildAppSource).toContain("fs.watch(target, { recursive: true }, scheduleBuild)");
  });

  test("production build emits rooted css/js assets from the html entrypoint", async () => {
    rmSync(distDir, { recursive: true, force: true });

    const proc = Bun.spawn(["bun", "scripts/build-app.ts"], {
      cwd: repoRoot,
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    expect(exitCode).toBe(0);
    expect(stderr).not.toContain("Could not resolve");

    const html = readFileSync(path.join(distDir, "index.html"), "utf8");
    const scriptMatch = html.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
    const stylesheetHrefs = Array.from(html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)).map((match) => match[1]);

    expect(html).not.toContain('src="/src/main.tsx"');
    expect(html).not.toContain('href="./index.compiled.css"');
    expect(stylesheetHrefs.length).toBeGreaterThan(0);
    expect(stylesheetHrefs.every((href) => href.startsWith("/"))).toBe(true);
    expect(stylesheetHrefs.every((href) => existsSync(path.join(distDir, href.replace(/^\//, ""))))).toBe(true);
    expect(scriptMatch).not.toBeNull();
    expect(scriptMatch?.[1]?.startsWith("/")).toBe(true);
    expect(existsSync(path.join(distDir, scriptMatch![1].replace(/^\//, "")))).toBe(true);
    expect(stdout).toBeString();
  });

  test("package metadata no longer depends on Vite tooling", () => {
    const devDependencies = (packageJson.devDependencies ?? {}) as Record<string, string>;

    expect(devDependencies.vite).toBeUndefined();
    expect(devDependencies["@vitejs/plugin-react"]).toBeUndefined();
  });
});

