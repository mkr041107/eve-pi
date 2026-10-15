"use client";

import { useCallback, useEffect, useState } from "react";
import { withBasePath } from "@/lib/config/site";
import { getSession, logout } from "@/lib/sso/client-auth";
import { loadForecast } from "@/lib/services/colony-sync-client";
import {
  createManualStock,
  listManualStocks,
} from "@/lib/services/manual-stocks-client";
import { startLogin } from "@/lib/sso/pkce";
import { ColonyCard } from "./ColonyCard";
import { HorizonControl } from "./HorizonControl";
import { ImportExportTable } from "./ImportExportTable";
import { ManualStockForm } from "./ManualStockForm";
import { StaleDataBanner } from "./StaleDataBanner";

type ForecastResponse = Awaited<ReturnType<typeof loadForecast>>;
type StockItem = ReturnType<typeof listManualStocks>[number];

export function DashboardClient() {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [session] = useState(() => getSession());

  const loadStocks = useCallback(() => {
    if (!session) return;
    setStocks(listManualStocks(session.characterId));
  }, [session]);

  const loadForecastData = useCallback(
    async (h: number) => {
      if (!session) {
        void startLogin();
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const json = await loadForecast(
          session.characterId,
          session.characterName,
          h,
        );
        setData(json);
        setHours(json.forecast.horizonHours);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [session],
  );

  useEffect(() => {
    if (!session) return;
    void loadForecastData(24);
    loadStocks();
  }, [loadForecastData, loadStocks, session]);

  async function refreshColonies() {
    if (!session) return;
    await loadForecastData(hours);
  }

  function handleLogout() {
    logout();
    window.location.href = withBasePath("/");
  }

  async function handleCreateStock(input: {
    typeId: number;
    amount: number;
    planetId?: number;
    note?: string;
  }) {
    if (!session) return;
    await createManualStock(session.characterId, input);
    loadStocks();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">EVE PI Dashboard</h1>
          {data && (
            <p className="text-sm text-zinc-400">
              {data.character.characterName} · character{" "}
              {data.character.characterId}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => refreshColonies()}
            disabled={loading}
            className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900 disabled:opacity-50"
          >
            Refresh colonies
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900"
          >
            Log out
          </button>
        </div>
      </header>

      {data && <StaleDataBanner message={data.forecast.staleWarning} />}

      <HorizonControl
        hours={hours}
        loading={loading}
        onChange={(h) => {
          if (h > 0) void loadForecastData(h);
        }}
      />

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {loading && !data && <p className="text-zinc-400">Loading forecast…</p>}

      {data && (
        <>
          <section className="grid gap-6 md:grid-cols-2">
            <ImportExportTable
              title={`Total net orbit imports (${data.forecast.horizonHours}h)`}
              rows={data.forecast.totals.netImports}
              emptyLabel="No net imports required."
            />
            <ImportExportTable
              title={`Total exports (${data.forecast.horizonHours}h)`}
              rows={data.forecast.totals.exports}
              emptyLabel="No exports forecast."
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium">Colonies</h2>
            {data.forecast.colonies.map((c) => (
              <ColonyCard key={c.planetId} colony={c} />
            ))}
          </section>
        </>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Manual stock timers</h2>
        <ManualStockForm
          onSubmit={async (input) => {
            try {
              await handleCreateStock(input);
            } catch (e) {
              throw e;
            }
          }}
        />
        <ul className="space-y-2">
          {stocks.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap justify-between gap-2 rounded border border-zinc-800 px-3 py-2 text-sm"
            >
              <span>
                Type {s.typeId}
                {s.planetId ? ` · planet ${s.planetId}` : ""} ·{" "}
                {s.amountAtEntry.toLocaleString()} units
              </span>
              <span
                className={
                  s.status === "needs_attention"
                    ? "text-amber-400"
                    : "text-zinc-400"
                }
              >
                {s.status === "needs_attention"
                  ? `Empty / needs attention (since ${new Date(s.emptyAt).toLocaleString()})`
                  : `${s.hoursLeft.toFixed(1)} h left`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
