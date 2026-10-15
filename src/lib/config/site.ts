/** Base path for GitHub Pages project sites (e.g. /eve-pi). Empty for local root or custom domain. */
export function getBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!raw || raw === "/") return "";
  return raw.startsWith("/") ? raw.replace(/\/$/, "") : `/${raw}`;
}

export function getAppOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}

export function getAppBaseUrl(): string {
  return `${getAppOrigin()}${getBasePath()}`;
}

export function getCallbackUrl(): string {
  // Must match EVE dev portal and Next `trailingSlash: true`
  return `${getAppBaseUrl()}/auth/callback/`;
}

export function getEveClientId(): string {
  return process.env.NEXT_PUBLIC_EVE_CLIENT_ID ?? "";
}

export function withBasePath(path: string): string {
  const base = getBasePath();
  if (!base) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
