"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getEveClientId } from "@/lib/config/site";
import { listAccounts } from "@/lib/sso/client-auth";
import { startLogin } from "@/lib/sso/pkce";

export function AuthHome() {
  const [accounts, setAccounts] = useState<{ characterId: number; characterName: string }[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const clientConfigured = Boolean(getEveClientId());

  useEffect(() => {
    setAccounts(listAccounts());
  }, []);

  async function onLogin() {
    setLoginError(null);
    try {
      await startLogin();
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "Login failed");
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">EVE PI Dashboard</h1>
        <p className="mt-3 text-zinc-400">
          Planetary industry forecasts via ESI. Runs entirely in your browser on
          GitHub Pages (PKCE login, local storage).
        </p>
      </div>

      {!clientConfigured && (
        <p className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          This build has no EVE Client ID. Add the{" "}
          <code className="text-amber-50">EVE_CLIENT_ID</code> GitHub Actions
          secret and redeploy (Actions → Deploy to GitHub Pages → Run workflow).
        </p>
      )}

      {loginError && (
        <p className="text-sm text-red-400" role="alert">{loginError}</p>
      )}

      {accounts.length > 0 ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-400">
            {accounts.length} character{accounts.length === 1 ? "" : "s"}:{" "}
            {accounts.map((a) => a.characterName).join(", ")}
          </p>
          <Link
            href="/dashboard"
            className="rounded-full bg-cyan-800 px-6 py-3 font-medium hover:bg-cyan-700"
          >
            Open dashboard
          </Link>
          <button
            type="button"
            onClick={() => void onLogin()}
            disabled={!clientConfigured}
            className="text-sm text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
          >
            Add another character
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void onLogin()}
          disabled={!clientConfigured}
          className="rounded-full bg-cyan-800 px-6 py-3 font-medium hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Log in with EVE SSO
        </button>
      )}
    </main>
  );
}
