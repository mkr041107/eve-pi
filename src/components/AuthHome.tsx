"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/sso/client-auth";
import { startLogin } from "@/lib/sso/pkce";

export function AuthHome() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(getSession()));
  }, []);

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">EVE PI Dashboard</h1>
        <p className="mt-3 text-zinc-400">
          Planetary industry forecasts via ESI. Runs entirely in your browser on
          GitHub Pages (PKCE login, local storage).
        </p>
      </div>
      {loggedIn ? (
        <Link
          href="/dashboard"
          className="rounded-full bg-cyan-800 px-6 py-3 font-medium hover:bg-cyan-700"
        >
          Open dashboard
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => void startLogin()}
          className="rounded-full bg-cyan-800 px-6 py-3 font-medium hover:bg-cyan-700"
        >
          Log in with EVE SSO
        </button>
      )}
    </main>
  );
}
