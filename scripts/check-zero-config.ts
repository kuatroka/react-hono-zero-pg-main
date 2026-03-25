import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const envPath = path.join(repoRoot, ".env");
const mainPath = path.join(repoRoot, "src", "main.tsx");

const envText = readFileSync(envPath, "utf8");
const mainText = readFileSync(mainPath, "utf8");

function getEnvValue(name: string): string | null {
  const match = envText.match(new RegExp(`^${name}=(.+)$`, "m"));
  if (!match) return null;
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

const viteGetQueriesUrl = getEnvValue("VITE_ZERO_GET_QUERIES_URL");
const apiPort = getEnvValue("API_PORT") ?? "4000";
const uiPortMatch = mainText.match(/window\.location\.origin/);

const problems: string[] = [];

if (!viteGetQueriesUrl) {
  problems.push("VITE_ZERO_GET_QUERIES_URL is missing");
} else {
  if (viteGetQueriesUrl.includes(`localhost:${apiPort}`)) {
    problems.push(
      `VITE_ZERO_GET_QUERIES_URL points cross-origin to localhost:${apiPort}; expected same-origin /api path to avoid browser CORS issues`
    );
  }

  if (!viteGetQueriesUrl.startsWith("/api") && !uiPortMatch) {
    problems.push(
      "src/main.tsx does not appear to derive getQueriesURL from window.location.origin while env points to an absolute URL"
    );
  }
}

if (problems.length > 0) {
  console.error("Zero config check failed:\n- " + problems.join("\n- "));
  process.exit(1);
}

console.log("Zero config check passed.");
