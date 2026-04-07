import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

describe("app shell styling parity", () => {
  test("source html and global stylesheet follow the reference app contract", () => {
    const html = readProjectFile("index.html");
    const main = readProjectFile("src/main.tsx");
    const css = readProjectFile("src/index.css");

    expect(html).toContain('href="./index.compiled.css"');
    expect(main).not.toContain('import "./index.css";');
    expect(css).toContain("min-height: 100vh;");
    expect(css).toContain("overflow-y: scroll;");
  });

  test("home and messages pages do not use legacy DaisyUI layout classes", () => {
    const main = readProjectFile("src/main.tsx");

    expect(main).not.toContain("bg-base-200");
    expect(main).not.toContain("btn btn-");
    expect(main).not.toContain("card bg-base-100");
    expect(main).not.toContain("card-body");
    expect(main).not.toContain("card-title");
    expect(main).not.toContain("form-control");
    expect(main).not.toContain("label-text");
    expect(main).not.toContain("input input-bordered");
    expect(main).not.toContain("select select-bordered");
    expect(main).not.toContain("table table-zebra");
    expect(main).not.toContain("link link-primary");
  });

  test("detail pages do not use legacy DaisyUI link classes", () => {
    const assetDetail = readProjectFile("src/pages/AssetDetail.tsx");
    const superinvestorDetail = readProjectFile("src/pages/SuperinvestorDetail.tsx");

    expect(assetDetail).not.toContain("link link-primary");
    expect(superinvestorDetail).not.toContain("link link-primary");
  });

  test("app shell no longer exposes the legacy counter route or landing-page CTA", () => {
    const main = readProjectFile("src/main.tsx");

    expect(main).not.toContain('path="/counter"');
    expect(main).not.toContain("CounterPage");
    expect(main).not.toContain("View Counter & Charts");
  });

  test("asset detail charts stay within the page width instead of using viewport breakout classes", () => {
    const assetDetail = readProjectFile("src/pages/AssetDetail.tsx");

    expect(assetDetail).not.toContain("w-screen");
    expect(assetDetail).not.toContain("left-1/2");
    expect(assetDetail).not.toContain("-ml-[50vw]");
  });

  test("home page uses the reference-style centered landing layout", () => {
    const main = readProjectFile("src/main.tsx");

    expect(main).toContain('className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"');
    expect(main).toContain('className="text-4xl font-bold tracking-tight mb-4"');
    expect(main).toContain('className="text-lg text-muted-foreground max-w-md"');
  });
});
