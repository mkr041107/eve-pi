import { createRemoteJWKSet, jwtVerify } from "jose";
import { getCallbackUrl, getEveClientId } from "@/lib/config/site";

const STORAGE = {
  refresh: "eve_pi_refresh_token",
  access: "eve_pi_access_token",
  expires: "eve_pi_access_expires_at",
  characterId: "eve_pi_character_id",
  characterName: "eve_pi_character_name",
};

export type ClientSession = {
  characterId: number;
  characterName: string;
};

async function getTokenEndpoint() {
  const meta = await fetch(
    "https://login.eveonline.com/.well-known/oauth-authorization-server",
  ).then((r) => r.json()) as { token_endpoint: string; jwks_uri: string; issuer: string };
  return meta;
}

export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
) {
  const clientId = getEveClientId();
  if (!clientId) throw new Error("EVE Client ID missing from build");

  const { token_endpoint, jwks_uri, issuer } = await getTokenEndpoint();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    redirect_uri: getCallbackUrl(),
    code_verifier: codeVerifier,
  });

  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const JWKS = createRemoteJWKSet(new URL(jwks_uri));
  const { payload } = await jwtVerify(tokens.access_token, JWKS, {
    issuer,
    audience: [clientId, "EVE Online"],
  });

  const sub = String(payload.sub ?? "");
  const match = /^CHARACTER:EVE:(\d+)$/.exec(sub);
  if (!match) throw new Error("Unexpected character id in token");

  const characterId = Number(match[1]);
  const characterName = String(payload.name ?? "Pilot");
  persistTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in, {
    characterId,
    characterName,
  });
  return { characterId, characterName };
}

function persistTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  session: ClientSession,
) {
  localStorage.setItem(STORAGE.access, accessToken);
  localStorage.setItem(STORAGE.refresh, refreshToken);
  localStorage.setItem(
    STORAGE.expires,
    String(Date.now() + expiresIn * 1000),
  );
  localStorage.setItem(STORAGE.characterId, String(session.characterId));
  localStorage.setItem(STORAGE.characterName, session.characterName);
}

export function getSession(): ClientSession | null {
  if (typeof window === "undefined") return null;
  const characterId = Number(localStorage.getItem(STORAGE.characterId));
  const characterName = localStorage.getItem(STORAGE.characterName);
  if (!Number.isFinite(characterId) || !characterName) return null;
  return { characterId, characterName };
}

export function logout() {
  if (typeof window === "undefined") return;
  for (const key of Object.values(STORAGE)) {
    localStorage.removeItem(key);
  }
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = getEveClientId();
  if (!clientId) throw new Error("EVE Client ID missing from build");
  const { token_endpoint } = await getTokenEndpoint();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    logout();
    throw new Error("Session expired — log in again");
  }
  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  const session = getSession();
  if (!session) throw new Error("No session");
  persistTokens(
    tokens.access_token,
    tokens.refresh_token ?? refreshToken,
    tokens.expires_in,
    session,
  );
  return tokens.access_token;
}

export async function getValidAccessToken(): Promise<string> {
  if (typeof window === "undefined") throw new Error("Not logged in");
  const access = localStorage.getItem(STORAGE.access);
  const expires = Number(localStorage.getItem(STORAGE.expires) ?? "0");
  if (access && expires > Date.now() + 60_000) return access;

  const refresh = localStorage.getItem(STORAGE.refresh);
  if (!refresh) throw new Error("Not logged in");
  return refreshAccessToken(refresh);
}
