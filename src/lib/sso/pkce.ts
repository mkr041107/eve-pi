import { getCallbackUrl, getEveClientId } from "@/lib/config/site";

const SCOPES = "esi-planets.manage_planets.v1";
const VERIFIER_KEY = "eve_pi_pkce_verifier";
const STATE_KEY = "eve_pi_oauth_state";

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

export async function generatePkcePair() {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64Url(verifierBytes);
  const challenge = base64Url(await sha256(verifier));
  return { verifier, challenge };
}

export async function startLogin() {
  const clientId = getEveClientId();
  if (!clientId) {
    throw new Error(
      "EVE Client ID is missing from this build. Set the EVE_CLIENT_ID repository secret and redeploy.",
    );
  }

  const meta = await fetch(
    "https://login.eveonline.com/.well-known/oauth-authorization-server",
  ).then((r) => r.json()) as { authorization_endpoint: string };

  const { verifier, challenge } = await generatePkcePair();
  const state = base64Url(crypto.getRandomValues(new Uint8Array(16)));
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: getCallbackUrl(),
    client_id: clientId,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  window.location.href = `${meta.authorization_endpoint}?${params}`;
}

export function consumePkceVerifier(): string | null {
  const v = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  return v;
}

export function validateOAuthState(returned: string | null): boolean {
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return Boolean(expected && returned && expected === returned);
}
