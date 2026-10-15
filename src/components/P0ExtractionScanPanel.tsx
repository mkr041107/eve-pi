import type { P0ExtractionAlert } from "@/lib/pi/forecast";

export type P0ScanRow = {
  characterId: number;
  characterName: string;
  planetId: number;
  planetName: string;
  solarSystemName: string;
  planetTypeLabel: string;
  alerts: P0ExtractionAlert[];
};

type Props = {
  rows: P0ScanRow[];
  horizonHours: number;
  loading: boolean;
  lastRunAt: Date | null;
  onScan: () => void;
};

export function P0ExtractionScanPanel({
  rows,
  horizonHours,
  loading,
  lastRunAt,
  onScan,
}: Props) {
  const alertCount = rows.reduce((n, r) => n + r.alerts.length, 0);

  return (
    <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">P0 extraction scan</h2>
          <p className="text-sm text-zinc-400">
            Checks all linked characters for planets where active extractors cannot
            supply enough raw material for on-planet factory demand over the next{" "}
            {horizonHours}h.
          </p>
        </div>
        <button
          type="button"
          onClick={onScan}
          disabled={loading}
          className="rounded border border-amber-700/60 bg-amber-950/30 px-3 py-1.5 text-sm text-amber-100 hover:bg-amber-950/50 disabled:opacity-50"
        >
          {loading ? "Scanning…" : "Scan all characters"}
        </button>
      </div>

      {lastRunAt && !loading && (
        <p className="text-xs text-zinc-500">
          Last scan {lastRunAt.toLocaleString()} · {alertCount} shortfall
          {alertCount === 1 ? "" : "s"} across {rows.length} planet
          {rows.length === 1 ? "" : "s"}
        </p>
      )}

      {!loading && lastRunAt && rows.length === 0 && (
        <p className="text-sm text-emerald-400/90">
          No issues found — extracted P0 (plus on-hand stock) covers factory demand
          for every planet with active extractors.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li
              key={`${row.characterId}-${row.planetId}`}
              className="rounded border border-amber-900/40 bg-amber-950/10 p-3"
            >
              <p className="font-medium text-amber-100">
                {row.characterName} · {row.planetName} · {row.planetTypeLabel} ·{" "}
                {row.solarSystemName}
              </p>
              <table className="mt-2 w-full text-left text-sm">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="pb-1 pr-2">Material</th>
                    <th className="pb-1 pr-2">Factory need</th>
                    <th className="pb-1 pr-2">Extracted</th>
                    <th className="pb-1 pr-2">On hand</th>
                    <th className="pb-1 pr-2">Orbit import</th>
                    <th className="pb-1">Shortfall</th>
                  </tr>
                </thead>
                <tbody>
                  {row.alerts.map((a) => (
                    <tr key={a.typeId} className="border-t border-zinc-800/80">
                      <td className="py-1 pr-2">{a.name}</td>
                      <td className="py-1 pr-2">{a.factoryDemand.toLocaleString()}</td>
                      <td className="py-1 pr-2">
                        {a.projectedExtraction.toLocaleString()}
                      </td>
                      <td className="py-1 pr-2">{a.onHand.toLocaleString()}</td>
                      <td className="py-1 pr-2">
                        {a.netOrbitImport > 0
                          ? a.netOrbitImport.toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-1 font-medium text-amber-400">
                        {a.shortfall.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
