export type AppRuntimeConfig = {
  appPublicUrl: string;
  zeroPublicUrl: string;
  zeroGetQueriesUrl: string;
  zeroMutateUrl: string;
};

const DEFAULT_API_PORT = 4001;

const DEFAULT_CONFIG: AppRuntimeConfig = {
  appPublicUrl: `http://localhost:${DEFAULT_API_PORT}`,
  zeroPublicUrl: "http://localhost:4848",
  zeroGetQueriesUrl: `http://localhost:${DEFAULT_API_PORT}/api/zero/get-queries`,
  zeroMutateUrl: `http://localhost:${DEFAULT_API_PORT}/api/zero/mutate`,
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeUrl(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimTrailingSlash(trimmed) : undefined;
}

function resolveRuntimeConfig(config: Partial<AppRuntimeConfig> | undefined): AppRuntimeConfig {
  const appPublicUrl = normalizeUrl(config?.appPublicUrl) ?? DEFAULT_CONFIG.appPublicUrl;

  return {
    appPublicUrl,
    zeroPublicUrl: normalizeUrl(config?.zeroPublicUrl) ?? DEFAULT_CONFIG.zeroPublicUrl,
    zeroGetQueriesUrl:
      normalizeUrl(config?.zeroGetQueriesUrl) ?? `${appPublicUrl}/api/zero/get-queries`,
    zeroMutateUrl: normalizeUrl(config?.zeroMutateUrl) ?? `${appPublicUrl}/api/zero/mutate`,
  };
}

export function getRuntimeConfig() {
  if (typeof window === "undefined") {
    return DEFAULT_CONFIG;
  }

  return resolveRuntimeConfig(window.__APP_CONFIG__);
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppRuntimeConfig>;
  }
}
