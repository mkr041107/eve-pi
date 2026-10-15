"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { withBasePath } from "@/lib/config/site";
import {
  getSession,
  listAccounts,
  logout,
  setActiveAccount,
  type ClientSession,
} from "@/lib/sso/client-auth";
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
import {
  P0ExtractionScanPanel,
  type P0ScanRow,
} from "./P0ExtractionScanPanel";
import { StaleDataBanner } from "./StaleDataBanner";

type ForecastResponse = Awaited<ReturnType<typeof loadForecast>>;
type StockItem = ReturnType<typeof listManualStocks>[number];
type ViewMode = "tabs" | "combined";

const VIEW_MODE_KEY = "eve_pi_dashboard_view";

type CommodityRow = {
  typeId: number;
  name: string;
  quantity: number;
};

function mergeCommodityRows(rows: CommodityRow[]): CommodityRow[] {
  const m = new Map<number, CommodityRow>();
  for (const item of rows) {
    const prev = m.get(item.typeId);
    if (prev) prev.quantity += item.quantity;
    else m.set(item.typeId, { ...item });
  }
  return [...m.values()].sort((a, b) => b.quantity - a.quantity);
}

function readViewMode(): ViewMode {
  if (typeof window === "undefined") return "tabs";
  const v = localStorage.getItem(VIEW_MODE_KEY);
  return v === "combined" ? "combined" : "tabs";
}

function ForecastPanels({ data }: { data: ForecastResponse }) {
  return (
    <>
      <StaleDataBanner message={data.forecast.staleWarning} />
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ImportExportTable
          title={`Factory inputs required (${data.forecast.horizonHours}h)`}
          rows={data.forecast.totals.grossFactoryInputs}
          emptyLabel="No active factory schematics detected."
        />
        <ImportExportTable
          title={`Net orbit imports (${data.forecast.horizonHours}h)`}
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
          <ColonyCard key={`${data.character.characterId}-${c.planetId}`} colony={c} />
        ))}
      </section>
    </>
  );
}

export function DashboardClient() {
  const [hours, setHours] = useState(24);
  const [accounts, setAccounts] = useState<ClientSession[]>(() => listAccounts());
  const [activeId, setActiveId] = useState<number | null>(() => {
    const session = getSession();
    return session?.characterId ?? accounts[0]?.characterId ?? null;
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => readViewMode());
  const [tabData, setTabData] = useState<ForecastResponse | null>(null);
  const [combinedData, setCombinedData] = useState<ForecastResponse[]>([]);
  const [stocks, setStocks] = useState<
    { session: ClientSession; items: StockItem[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [p0ScanRows, setP0ScanRows] = useState<P0ScanRow[]>([]);
  const [p0Scanning, setP0Scanning] = useState(false);
  const [p0ScanAt, setP0ScanAt] = useState<Date | null>(null);

  const activeSession = useMemo(
    () => accounts.find((a) => a.characterId === activeId) ?? null,
    [accounts, activeId],
  );

  const loadStocks = useCallback(() => {
    const currentAccounts = listAccounts();
    setStocks(
      currentAccounts.map((session) => ({
        session,
        items: listManualStocks(session.characterId),
      })),
    );
  }, []);

  const loadForecastData = useCallback(
    async (h: number, tabCharacterId?: number) => {
      const currentAccounts = listAccounts();
      if (currentAccounts.length === 0) {
        void startLogin();
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (viewMode === "tabs") {
          const id =
            tabCharacterId ??
            activeId ??
            currentAccounts[0]?.characterId;
          const session =
            currentAccounts.find((a) => a.characterId === id) ??
            currentAccounts[0];
          const json = await loadForecast(
            session.characterId,
            session.characterName,
            h,
          );
          setTabData(json);
          setHours(json.forecast.horizonHours);
        } else {
          const results = await Promise.all(
            currentAccounts.map((a) =>
              loadForecast(a.characterId, a.characterName, h),
            ),
          );
          setCombinedData(results);
          const horizon = results[0]?.forecast.horizonHours ?? h;
          setHours(horizon);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [activeId, viewMode],
  );

  useEffect(() => {
    const current = listAccounts();
    setAccounts(current);
    const session = getSession();
    setActiveId(session?.characterId ?? current[0]?.characterId ?? null);
    if (current.length === 0) return;
    void loadForecastData(24);
    loadStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + return from OAuth
  }, []);

  useEffect(() => {
    if (activeId !== null) setActiveAccount(activeId);
  }, [activeId]);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const combinedTotals = useMemo(() => {
    if (combinedData.length === 0) return null;
    const horizon = combinedData[0]?.forecast.horizonHours ?? hours;
    return {
      horizonHours: horizon,
      grossFactoryInputs: mergeCommodityRows(
        combinedData.flatMap((d) => d.forecast.totals.grossFactoryInputs),
      ),
      netImports: mergeCommodityRows(
        combinedData.flatMap((d) => d.forecast.totals.netImports),
      ),
      exports: mergeCommodityRows(
        combinedData.flatMap((d) => d.forecast.totals.exports),
      ),
      staleWarnings: combinedData
        .map((d) => d.forecast.staleWarning)
        .filter(Boolean),
    };
  }, [combinedData, hours]);

  async function refreshColonies() {
    await loadForecastData(hours);
  }

  function handleLogout(characterId?: number) {
    logout(characterId);
    const remaining = listAccounts();
    if (remaining.length === 0) {
      window.location.href = withBasePath("/");
      return;
    }
    setAccounts(remaining);
    const nextId = remaining[0]?.characterId ?? null;
    setActiveId(nextId);
    setTabData(null);
    setCombinedData([]);
    if (remaining.length > 0) void loadForecastData(hours, nextId ?? undefined);
    loadStocks();
  }

  async function handleAddCharacter() {
    try {
      await startLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  }

  async function handleCreateStock(
    characterId: number,
    input: {
      typeId: number;
      amount: number;
      planetId?: number;
      note?: string;
    },
  ) {
    await createManualStock(characterId, input);
    loadStocks();
  }

  function switchViewMode(mode: ViewMode) {
    setViewMode(mode);
    void loadForecastData(hours);
  }

  async function runP0Scan() {
    const currentAccounts = listAccounts();
    if (currentAccounts.length === 0) return;
    setP0Scanning(true);
    setError(null);
    try {
      const rows: P0ScanRow[] = [];
      for (const account of currentAccounts) {
        const data = await loadForecast(
          account.characterId,
          account.characterName,
          hours,
        );
        for (const colony of data.forecast.colonies) {
          if (colony.p0Alerts.length === 0) continue;
          rows.push({
            characterId: account.characterId,
            characterName: account.characterName,
            planetId: colony.planetId,
            planetName: colony.planetName,
            solarSystemName: colony.solarSystemName,
            planetTypeLabel: colony.planetTypeLabel,
            alerts: colony.p0Alerts,
          });
        }
      }
      setP0ScanRows(rows);
      setP0ScanAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "P0 scan failed");
    } finally {
      setP0Scanning(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">EVE PI Dashboard</h1>
          <p className="text-sm text-zinc-400">
            {accounts.length} character{accounts.length === 1 ? "" : "s"} logged
            in
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleAddCharacter()}
            className="rounded border border-cyan-800/60 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-950/40"
          >
            Add character
          </button>
          <button
            type="button"
            onClick={() => refreshColonies()}
            disabled={loading}
            className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900 disabled:opacity-50"
          >
            Refresh colonies
          </button>
          {accounts.length > 1 && (
            <button
              type="button"
              onClick={() => handleLogout()}
              className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900"
            >
              Log out all
            </button>
          )}
          {activeSession && (
            <button
              type="button"
              onClick={() => handleLogout(activeSession.characterId)}
              className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900"
            >
              Remove {activeSession.characterName}
            </button>
          )}
        </div>
      </header>

      {accounts.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-zinc-500">Layout</span>
          <div className="flex rounded-lg border border-zinc-800 p-0.5 text-sm">
            <button
              type="button"
              onClick={() => switchViewMode("tabs")}
              className={`rounded-md px-3 py-1 ${
                viewMode === "tabs"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Per character
            </button>
            <button
              type="button"
              onClick={() => switchViewMode("combined")}
              className={`rounded-md px-3 py-1 ${
                viewMode === "combined"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Combined list
            </button>
          </div>
        </div>
      )}

      {viewMode === "tabs" && accounts.length > 1 && (
        <nav
          className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2"
          aria-label="Characters"
        >
          {accounts.map((a) => (
            <button
              key={a.characterId}
              type="button"
              onClick={() => {
                setActiveId(a.characterId);
                void loadForecastData(hours, a.characterId);
              }}
              className={`rounded-t px-3 py-1.5 text-sm ${
                a.characterId === activeId
                  ? "border-b-2 border-cyan-600 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {a.characterName}
            </button>
          ))}
        </nav>
      )}

      <HorizonControl
        hours={hours}
        loading={loading}
        onChange={(h) => {
          if (h > 0) void loadForecastData(h);
        }}
      />

      <P0ExtractionScanPanel
        rows={p0ScanRows}
        horizonHours={hours}
        loading={p0Scanning}
        lastRunAt={p0ScanAt}
        onScan={() => void runP0Scan()}
      />

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {loading && !tabData && combinedData.length === 0 && (
        <p className="text-zinc-400">Loading forecast…</p>
      )}

      {viewMode === "tabs" && tabData && <ForecastPanels data={tabData} />}

      {viewMode === "combined" && combinedTotals && (
        <>
          {combinedTotals.staleWarnings.map((msg, i) => (
            <StaleDataBanner key={i} message={msg} />
          ))}
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ImportExportTable
              title={`All characters — factory inputs (${combinedTotals.horizonHours}h)`}
              rows={combinedTotals.grossFactoryInputs}
              emptyLabel="No active factory schematics detected."
            />
            <ImportExportTable
              title={`All characters — net orbit imports (${combinedTotals.horizonHours}h)`}
              rows={combinedTotals.netImports}
              emptyLabel="No net imports required."
            />
            <ImportExportTable
              title={`All characters — exports (${combinedTotals.horizonHours}h)`}
              rows={combinedTotals.exports}
              emptyLabel="No exports forecast."
            />
          </section>
          <section className="space-y-8">
            {combinedData.map((d) => (
              <div key={d.character.characterId} className="space-y-4">
                <h2 className="text-lg font-medium">
                  {d.character.characterName}
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    character {d.character.characterId}
                  </span>
                </h2>
                {d.forecast.colonies.map((c) => (
                  <ColonyCard
                    key={`${d.character.characterId}-${c.planetId}`}
                    colony={c}
                  />
                ))}
              </div>
            ))}
          </section>
        </>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Manual stock timers</h2>
        {accounts.length === 1 && activeSession && (
          <ManualStockForm
            onSubmit={async (input) => {
              await handleCreateStock(activeSession.characterId, input);
            }}
          />
        )}
        {accounts.length > 1 && (
          <p className="text-sm text-zinc-500">
            Add stock entries per character using the form under each character
            below.
          </p>
        )}
        {accounts.map((session) => (
          <div key={session.characterId} className="space-y-2">
            {accounts.length > 1 && (
              <>
                <h3 className="text-sm font-medium text-zinc-300">
                  {session.characterName}
                </h3>
                <ManualStockForm
                  onSubmit={async (input) => {
                    await handleCreateStock(session.characterId, input);
                  }}
                />
              </>
            )}
            <ul className="space-y-2">
              {(stocks.find((s) => s.session.characterId === session.characterId)
                ?.items ?? []
              ).map((s) => (
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
          </div>
        ))}
      </section>
    </div>
  );
}
