import { getCompatibilityDate, getEnv } from "@/lib/env";

export type EsiResponse<T> = {
  data: T;
  etag?: string;
  expiresAt?: Date;
  status: number;
  fromCache: boolean;
};

export class EsiError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export async function esiFetch<T>(
  path: string,
  accessToken: string,
  opts?: { etag?: string; method?: string },
): Promise<EsiResponse<T>> {
  const env = getEnv();
  const url = `https://esi.evetech.net/latest${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": env.ESI_USER_AGENT,
    "X-Compatibility-Date": getCompatibilityDate(),
    Accept: "application/json",
  };
  if (opts?.etag) headers["If-None-Match"] = opts.etag;

  const res = await fetch(url, { method: opts?.method ?? "GET", headers });

  if (res.status === 304) {
    return { data: null as T, status: 304, fromCache: true };
  }

  if (res.status === 429) {
    const retry = Number(res.headers.get("Retry-After") ?? "5");
    throw new EsiError("ESI rate limited", 429, retry);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new EsiError(`ESI ${path} failed: ${res.status} ${body}`, res.status);
  }

  const expiresHeader = res.headers.get("Expires");
  const expiresAt = expiresHeader ? new Date(expiresHeader) : undefined;

  if (process.env.NODE_ENV === "development") {
    const remain = res.headers.get("X-ESI-Error-Limit-Remain");
    const reset = res.headers.get("X-ESI-Error-Limit-Reset");
    if (remain) {
      console.info(`[esi] error-limit-remain=${remain} reset=${reset ?? "?"}`);
    }
  }

  const data = (await res.json()) as T;
  return {
    data,
    etag: res.headers.get("ETag") ?? undefined,
    expiresAt,
    status: res.status,
    fromCache: false,
  };
}
