import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "../env";

const COOKIE = "eve_pi_session";

export type SessionPayload = {
  characterId: number;
  characterName: string;
};

function secretKey() {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const characterId = Number(payload.characterId);
    const characterName = String(payload.characterName ?? "");
    if (!Number.isFinite(characterId) || !characterName) return null;
    return { characterId, characterName };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
