import { createRemoteJWKSet, jwtVerify } from "jose";
import { getCallbackUrl, getEveClientId } from "@/lib/config/site";

const LEGACY = {
  refresh: "eve_pi_refresh_token",
  access: "eve_pi_access_token",
  expires: "eve_pi_access_expires_at",
  characterId: "eve_pi_character_id",
  characterName: "eve_pi_character_name",
};

const STORAGE = {
  accounts: "eve_pi_accounts",
  activeId: "eve_pi_active_character_id",
};

export type ClientSession = {
  characterId: number;
  characterName: string;
};

type StoredAccount = ClientSession & {
  access: string;
  refresh: string;
  expiresAt: number;
};

function migrateLegacySession() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE.accounts)) return;

  const characterId = Number(localStorage.getItem(LEGACY.characterId));
  const characterName = localStorage.getItem(LEGACY.characterName);
  const access = localStorage.getItem(LEGACY.access);
  const refresh = localStorage.getItem(LEGACY.refresh);
  const expiresAt = Number(localStorage.getItem(LEGACY.expires) ?? "0");

  if (
    !Number.isFinite(characterId) ||
    !characterName ||
    !access ||
    !refresh
  ) {
    return;
  }

  writeAccounts({
    [characterId]: {
      characterId,
      characterName,
      access,
      refresh,
      expiresAt,
    },
  });
  localStorage.setItem(STORAGE.activeId, String(characterId));

  for (const key of Object.values(LEGACY)) {
    localStorage.removeItem(key);
  }
}

function readAccountsMap(): Record<number, StoredAccount> {
  if (typeof window === "undefined") return {};
  migrateLegacySession();
  const raw = localStorage.getItem(STORAGE.accounts);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, StoredAccount>;
    const out: Record<number, StoredAccount> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const id = Number(key);
      if (Number.isFinite(id) && value?.access && value?.refresh) {
        out[id] = { ...value, characterId: id };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeAccounts(accounts: Record<number, StoredAccount>) {
  localStorage.setItem(STORAGE.accounts, JSON.stringify(accounts));
}

function getActiveCharacterId(): number | null {
  if (typeof window === "undefined") return null;
  const accounts = readAccountsMap();
  const stored = Number(localStorage.getItem(STORAGE.activeId));
  if (Number.isFinite(stored) && accounts[stored]) return stored;
  const first = Object.keys(accounts)[0];
  return first ? Number(first) : null;
}

export function listAccounts(): ClientSession[] {
  const accounts = readAccountsMap();
  return Object.values(accounts)
    .map(({ characterId, characterName }) => ({ characterId, characterName }))
    .sort((a, b) => a.characterName.localeCompare(b.characterName));
}

export function setActiveAccount(characterId: number) {
  if (typeof window === "undefined") return;
  const accounts = readAccountsMap();
  if (!accounts[characterId]) return;
  localStorage.setItem(STORAGE.activeId, String(characterId));
}

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
  const accounts = readAccountsMap();
  accounts[session.characterId] = {
    characterId: session.characterId,
    characterName: session.characterName,
    access: accessToken,
    refresh: refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  writeAccounts(accounts);
  localStorage.setItem(STORAGE.activeId, String(session.characterId));
}

export function getSession(): ClientSession | null {
  if (typeof window === "undefined") return null;
  const activeId = getActiveCharacterId();
  if (activeId === null) return null;
  const account = readAccountsMap()[activeId];
  if (!account) return null;
  return {
    characterId: account.characterId,
    characterName: account.characterName,
  };
}

export function logout(characterId?: number) {
  if (typeof window === "undefined") return;
  if (characterId === undefined) {
    localStorage.removeItem(STORAGE.accounts);
    localStorage.removeItem(STORAGE.activeId);
    for (const key of Object.values(LEGACY)) {
      localStorage.removeItem(key);
    }
    return;
  }

  const accounts = readAccountsMap();
  delete accounts[characterId];
  writeAccounts(accounts);

  const active = getActiveCharacterId();
  if (active === characterId) {
    const remaining = Object.keys(accounts);
    if (remaining.length > 0) {
      localStorage.setItem(STORAGE.activeId, remaining[0]);
    } else {
      localStorage.removeItem(STORAGE.activeId);
    }
  }
}

async function refreshAccessToken(characterId: number, refreshToken: string) {
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
    logout(characterId);
    throw new Error("Session expired — log in again for this character");
  }
  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  const account = readAccountsMap()[characterId];
  if (!account) throw new Error("No session");
  persistTokens(
    tokens.access_token,
    tokens.refresh_token ?? refreshToken,
    tokens.expires_in,
    {
      characterId: account.characterId,
      characterName: account.characterName,
    },
  );
  return tokens.access_token;
}

export async function getValidAccessToken(characterId: number): Promise<string> {
  if (typeof window === "undefined") throw new Error("Not logged in");
  const account = readAccountsMap()[characterId];
  if (!account) throw new Error("Not logged in for this character");

  if (account.access && account.expiresAt > Date.now() + 60_000) {
    return account.access;
  }

  return refreshAccessToken(characterId, account.refresh);
}
