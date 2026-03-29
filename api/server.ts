import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { app } from "./index";

const DEFAULT_DIST_DIR = path.resolve(import.meta.dir, "..", "dist");
const DEFAULT_API_PORT = 4001;
const DEFAULT_ZERO_PUBLIC_URL = "http://localhost:4848";

export type AppRuntimeConfig = {
  appPublicUrl: string;
  zeroPublicUrl: string;
  zeroGetQueriesUrl: string;
  zeroMutateUrl: string;
};

const STATIC_FILE_EXTENSIONS = new Set([
  "avif",
  "css",
  "gif",
  "ico",
  "jpeg",
  "jpg",
  "js",
  "json",
  "map",
  "mjs",
  "png",
  "svg",
  "txt",
  "webmanifest",
  "webp",
  "woff",
  "woff2",
]);

function isAssetPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments.at(-1);

  if (!lastSegment) {
    return false;
  }

  const extensionIndex = lastSegment.lastIndexOf(".");
  if (extensionIndex <= 0) {
    return false;
  }

  const extension = lastSegment.slice(extensionIndex + 1).toLowerCase();
  return STATIC_FILE_EXTENSIONS.has(extension);
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function readUrlEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? trimTrailingSlash(value) : undefined;
}

export function getRuntimeConfig(): AppRuntimeConfig {
  const apiPort = Number(process.env.API_PORT ?? String(DEFAULT_API_PORT));
  const explicitAppPublicUrl = readUrlEnv("APP_PUBLIC_URL");
  const appPublicUrl = explicitAppPublicUrl ?? `http://localhost:${apiPort}`;

  return {
    appPublicUrl,
    zeroPublicUrl: readUrlEnv("ZERO_PUBLIC_URL") ?? readUrlEnv("VITE_PUBLIC_SERVER") ?? DEFAULT_ZERO_PUBLIC_URL,
    zeroGetQueriesUrl:
      (explicitAppPublicUrl ? `${appPublicUrl}/api/zero/get-queries` : undefined) ??
      readUrlEnv("ZERO_QUERY_URL") ??
      readUrlEnv("VITE_ZERO_GET_QUERIES_URL") ??
      `${appPublicUrl}/api/zero/get-queries`,
    zeroMutateUrl:
      (explicitAppPublicUrl ? `${appPublicUrl}/api/zero/mutate` : undefined) ??
      readUrlEnv("ZERO_MUTATE_URL") ??
      `${appPublicUrl}/api/zero/mutate`,
  };
}

function getContentType(filePath: string) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".ico")) return "image/x-icon";
  return undefined;
}

function serveFile(filePath: string) {
  const file = Bun.file(filePath);
  const contentType = getContentType(filePath);
  return new Response(file, {
    headers: contentType ? { "content-type": contentType } : undefined,
  });
}

function serializeRuntimeConfig(config: AppRuntimeConfig) {
  return JSON.stringify(config).replace(/</g, "\\u003c");
}

function injectRuntimeConfig(html: string, config: AppRuntimeConfig) {
  const configScript = `<script>window.__APP_CONFIG__=${serializeRuntimeConfig(config)};</script>`;

  if (html.includes("</head>")) {
    return html.replace("</head>", `  ${configScript}\n  </head>`);
  }

  return html.replace("<body>", `<body>\n    ${configScript}`);
}

async function serveIndexHtml(filePath: string) {
  const html = await Bun.file(filePath).text();
  return new Response(injectRuntimeConfig(html, getRuntimeConfig()), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export function createSpaFetchHandler({ distDir = DEFAULT_DIST_DIR }: { distDir?: string } = {}) {
  return async (request: Request) => {
    const url = new URL(request.url);

    if (url.pathname === "/healthz") {
      return Response.json({ ok: true });
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return app.fetch(request);
    }

    const requestedFile = path.join(distDir, url.pathname.replace(/^\/+/, ""));
    if (existsSync(requestedFile) && !url.pathname.endsWith("/")) {
      const requestedFileStats = statSync(requestedFile);
      if (requestedFileStats.isFile()) {
        if (path.basename(requestedFile) === "index.html") {
          return serveIndexHtml(requestedFile);
        }
        return serveFile(requestedFile);
      }
    }

    if (isAssetPath(url.pathname)) {
      return new Response("Not Found", { status: 404 });
    }

    const indexFile = path.join(distDir, "index.html");
    if (existsSync(indexFile)) {
      return serveIndexHtml(indexFile);
    }

    return new Response("Not Found", { status: 404 });
  };
}

type ServerOptions = {
  port?: number;
  fetch?: ReturnType<typeof createSpaFetchHandler>;
  serve?: (options: { port: number; fetch: ReturnType<typeof createSpaFetchHandler> }) => unknown;
  log?: (message: string) => void;
};

export function startServer({
  port = Number(process.env.API_PORT ?? DEFAULT_API_PORT),
  fetch = createSpaFetchHandler(),
  serve = Bun.serve,
  log = console.log,
}: ServerOptions = {}) {
  const server = serve({
    port,
    fetch,
  });

  log(`Dev server ready: frontend http://localhost:${port} | backend http://localhost:${port}/api`);
  return server;
}

if (import.meta.main) {
  startServer();
}
