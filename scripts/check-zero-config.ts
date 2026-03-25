import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const envPath = path.join(repoRoot, ".env");

const envText = readFileSync(envPath, "utf8");

function getEnvValue(name: string): string | null {
  const match = envText.match(new RegExp(`^${name}=(.+)$`, "m"));
  if (!match) return null;
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

const viteGetQueriesUrl = getEnvValue("VITE_ZERO_GET_QUERIES_URL");
const zeroQueryUrl = getEnvValue("ZERO_QUERY_URL");
const deprecatedZeroGetQueriesUrl = getEnvValue("ZERO_GET_QUERIES_URL");
const deprecatedZeroForwardCookies = getEnvValue("ZERO_GET_QUERIES_FORWARD_COOKIES");
const zeroQueryForwardCookies = getEnvValue("ZERO_QUERY_FORWARD_COOKIES");
const apiPort = getEnvValue("API_PORT") ?? "4000";
const expectedQueryUrl = `http://localhost:${apiPort}/api/zero/get-queries`;

const problems: string[] = [];

if (!viteGetQueriesUrl) {
  problems.push("VITE_ZERO_GET_QUERIES_URL is missing");
} else if (viteGetQueriesUrl !== expectedQueryUrl) {
  problems.push(
    `VITE_ZERO_GET_QUERIES_URL must be exactly ${expectedQueryUrl} so Zero Cache accepts the browser query URL`
  );
}

if (!zeroQueryUrl) {
  problems.push("ZERO_QUERY_URL is missing; Zero 1.x expects ZERO_QUERY_URL for custom queries");
} else if (zeroQueryUrl !== expectedQueryUrl) {
  problems.push(
    `ZERO_QUERY_URL must be exactly ${expectedQueryUrl} so Zero Cache can validate and fetch the custom query transformer`
  );
}

if (viteGetQueriesUrl && zeroQueryUrl && viteGetQueriesUrl !== zeroQueryUrl) {
  problems.push("VITE_ZERO_GET_QUERIES_URL and ZERO_QUERY_URL must match exactly in Zero 1.x");
}

if (deprecatedZeroGetQueriesUrl) {
  problems.push("ZERO_GET_QUERIES_URL is still set; replace it with ZERO_QUERY_URL for Zero 1.x");
}

if (deprecatedZeroForwardCookies) {
  problems.push(
    "ZERO_GET_QUERIES_FORWARD_COOKIES is still set; replace it with ZERO_QUERY_FORWARD_COOKIES for Zero 1.x"
  );
}

if (!zeroQueryForwardCookies) {
  problems.push("ZERO_QUERY_FORWARD_COOKIES is missing");
}

if (problems.length > 0) {
  console.error("Zero config check failed:\n- " + problems.join("\n- "));
  process.exit(1);
}

console.log("Zero config check passed.");
