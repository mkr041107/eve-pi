const METADATA_URL =
  "https://login.eveonline.com/.well-known/oauth-authorization-server";

export type SsoMetadata = {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
};

let cache: { at: number; data: SsoMetadata } | null = null;

export async function getSsoMetadata(): Promise<SsoMetadata> {
  if (cache && Date.now() - cache.at < 60 * 60 * 1000) {
    return cache.data;
  }
  const res = await fetch(METADATA_URL);
  if (!res.ok) throw new Error(`SSO metadata fetch failed: ${res.status}`);
  const data = (await res.json()) as SsoMetadata;
  cache = { at: Date.now(), data };
  return data;
}
