"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/config/site";
import {
  consumePkceVerifier,
  validateOAuthState,
} from "@/lib/sso/pkce";
import { exchangeAuthorizationCode } from "@/lib/sso/client-auth";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      if (!code) {
        setError("Missing authorization code");
        return;
      }
      if (!validateOAuthState(state)) {
        setError("Invalid OAuth state");
        return;
      }
      const verifier = consumePkceVerifier();
      if (!verifier) {
        setError("Missing PKCE verifier — try logging in again");
        return;
      }
      try {
        await exchangeAuthorizationCode(code, verifier);
        window.location.replace(withBasePath("/dashboard"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Login failed");
      }
    }
    void run();
  }, []);

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      {error ? (
        <>
          <p className="text-red-400">{error}</p>
          <a href={withBasePath("/")} className="text-cyan-400 underline">
            Back home
          </a>
        </>
      ) : (
        <p className="text-zinc-400">Completing EVE SSO login…</p>
      )}
    </main>
  );
}
