function compatibilityDate(): string {
  const fixed = process.env.NEXT_PUBLIC_ESI_COMPATIBILITY_DATE;
  if (fixed) return fixed;
  const shifted = new Date(Date.now() - 11 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function userAgentParam(): string {
  const ua =
    process.env.NEXT_PUBLIC_ESI_USER_AGENT ??
    "eve-pi/0.1.0 (github-pages; +https://github.com/eve-pi)";
  return encodeURIComponent(ua);
}

export type EsiResult<T> = {
  data: T;
  etag?: string;
  expiresAt?: Date;
  status: number;
  notModified: boolean;
};

export async function esiFetch<T>(
  path: string,
  accessToken: string,
  opts?: { etag?: string },
): Promise<EsiResult<T>> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://esi.evetech.net/latest${path}${sep}user_agent=${userAgentParam()}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "X-Compatibility-Date": compatibilityDate(),
    Accept: "application/json",
    "X-User-Agent":
      process.env.NEXT_PUBLIC_ESI_USER_AGENT ??
      "eve-pi/0.1.0 (github-pages)",
  };
  if (opts?.etag) headers["If-None-Match"] = opts.etag;

  const res = await fetch(url, { headers });

  if (res.status === 304) {
    return { data: null as T, status: 304, notModified: true };
  }

  if (res.status === 429) {
    const retry = Number(res.headers.get("Retry-After") ?? "5");
    await new Promise((r) => setTimeout(r, retry * 1000));
    return esiFetch(path, accessToken, opts);
  }

  if (!res.ok) {
    throw new Error(`ESI ${path} failed: ${res.status} ${await res.text()}`);
  }

  const expiresHeader = res.headers.get("Expires");
  return {
    data: (await res.json()) as T,
    etag: res.headers.get("ETag") ?? undefined,
    expiresAt: expiresHeader ? new Date(expiresHeader) : undefined,
    status: res.status,
    notModified: false,
  };
}
