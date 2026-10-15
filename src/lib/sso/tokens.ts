import { createRemoteJWKSet, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getEnv } from "@/lib/env";
import { getSsoMetadata } from "./metadata";

const SCOPES = ["esi-planets.manage_planets.v1"];

export function getRequestedScopes(): string {
  return SCOPES.join(" ");
}

export async function exchangeAuthorizationCode(code: string) {
  const meta = await getSsoMetadata();
  const env = getEnv();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: env.EVE_CLIENT_ID,
    client_secret: env.EVE_CLIENT_SECRET,
  });
  const res = await fetch(meta.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const meta = await getSsoMetadata();
  const env = getEnv();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.EVE_CLIENT_ID,
    client_secret: env.EVE_CLIENT_SECRET,
  });
  const res = await fetch(meta.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
  };
}

export async function verifyAccessTokenJwt(accessToken: string) {
  const meta = await getSsoMetadata();
  const env = getEnv();
  const JWKS = createRemoteJWKSet(new URL(meta.jwks_uri));
  const { payload } = await jwtVerify(accessToken, JWKS, {
    issuer: meta.issuer,
    audience: [env.EVE_CLIENT_ID, "EVE Online"],
  });
  const sub = String(payload.sub ?? "");
  const match = /^CHARACTER:EVE:(\d+)$/.exec(sub);
  if (!match) throw new Error("Unexpected JWT sub claim");
  const characterId = Number(match[1]);
  const name = String(payload.name ?? "Pilot");
  const scp = payload.scp;
  const scopes = Array.isArray(scp) ? scp.map(String) : [];
  return { characterId, characterName: name, scopes };
}

export async function upsertCharacterTokens(
  characterId: number,
  characterName: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
) {
  const accessExpiresAt = new Date(Date.now() + expiresIn * 1000);
  await db
    .insert(characters)
    .values({
      characterId,
      characterName,
      refreshTokenEnc: encryptSecret(refreshToken),
      accessTokenEnc: encryptSecret(accessToken),
      accessExpiresAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: characters.characterId,
      set: {
        characterName,
        refreshTokenEnc: encryptSecret(refreshToken),
        accessTokenEnc: encryptSecret(accessToken),
        accessExpiresAt,
        updatedAt: new Date(),
      },
    });
}

export async function getValidAccessToken(characterId: number): Promise<string> {
  const [row] = await db
    .select()
    .from(characters)
    .where(eq(characters.characterId, characterId))
    .limit(1);
  if (!row) throw new Error("Character not logged in");

  const now = Date.now();
  const expires = row.accessExpiresAt?.getTime() ?? 0;
  if (row.accessTokenEnc && expires > now + 60_000) {
    return decryptSecret(row.accessTokenEnc);
  }

  const refresh = decryptSecret(row.refreshTokenEnc);
  const tokens = await refreshAccessToken(refresh);
  const accessExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  await db
    .update(characters)
    .set({
      accessTokenEnc: encryptSecret(tokens.access_token),
      refreshTokenEnc: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : row.refreshTokenEnc,
      accessExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(characters.characterId, characterId));

  return tokens.access_token;
}
