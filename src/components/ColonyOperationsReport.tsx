import type { ColonyOperationsReport } from "@/lib/pi/colony-report";
import { ImportExportTable } from "./ImportExportTable";

type Props = {
  report: ColonyOperationsReport;
};

export function ColonyOperationsReportView({ report }: Props) {
  const hasLaunchpads = report.launchpads.length > 0;
  const hasFactories = report.factories.length > 0;
  const hasRoutes = report.launchpadRoutes.length > 0;

  if (!hasLaunchpads && !hasFactories && !hasRoutes) {
    return (
      <p className="text-sm text-zinc-500">
        No launchpads, factories, or launchpad routes in the cached layout.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {hasLaunchpads && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-300">Launchpad stock (ESI snapshot)</h3>
          {report.launchpads.map((pad) => (
            <div
              key={pad.pinId}
              className="rounded border border-zinc-800/80 bg-zinc-900/30 p-3"
            >
              <p className="mb-2 text-xs text-zinc-500">
                Pin {pad.pinId} · {pad.typeName}
              </p>
              <ImportExportTable
                title="Contents"
                rows={pad.contents.map((c) => ({
                  typeId: c.typeId,
                  name: c.name,
                  quantity: c.amount,
                }))}
                emptyLabel="Empty."
              />
            </div>
          ))}
        </div>
      )}

      {hasFactories && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-300">Factories</h3>
          {report.factories.map((f) => (
            <div
              key={f.pinId}
              className="rounded border border-zinc-800/80 bg-zinc-900/30 p-3"
            >
              <p className="text-sm text-zinc-200">
                Pin {f.pinId} · {f.facilityTypeName}
              </p>
              <p className="text-xs text-zinc-500">
                {f.schematicName
                  ? `Recipe: ${f.schematicName} (id ${f.schematicId}) · ~${f.cyclesPerHour} cycles/h`
                  : "No active schematic on this pin."}
              </p>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <ImportExportTable
                  title="In pin storage"
                  rows={f.contents.map((c) => ({
                    typeId: c.typeId,
                    name: c.name,
                    quantity: c.amount,
                  }))}
                  emptyLabel="Empty."
                />
                <ImportExportTable
                  title="Inputs per cycle"
                  rows={f.inputsPerCycle.map((c) => ({
                    typeId: c.typeId,
                    name: c.name,
                    quantity: c.amount,
                  }))}
                  emptyLabel="—"
                />
                <ImportExportTable
                  title="Outputs per cycle"
                  rows={f.outputsPerCycle.map((c) => ({
                    typeId: c.typeId,
                    name: c.name,
                    quantity: c.amount,
                  }))}
                  emptyLabel="—"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {hasRoutes && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-zinc-300">
            Routes involving launchpads
          </h3>
          <p className="mb-2 text-xs text-zinc-500">
            Quantities match ESI route settings (app treats them as units per hourly planet tick).
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="py-1 pr-2">Direction</th>
                <th className="py-1 pr-2">Commodity</th>
                <th className="py-1 pr-2">Qty / h</th>
                <th className="py-1 pr-2">From pin</th>
                <th className="py-1">To pin</th>
              </tr>
            </thead>
            <tbody>
              {report.launchpadRoutes.map((r) => (
                <tr key={r.routeId} className="border-t border-zinc-800">
                  <td className="py-1 pr-2 text-zinc-400">
                    {r.direction === "into_launchpad" ? "→ pad" : "← pad"}
                  </td>
                  <td className="py-1 pr-2">{r.name}</td>
                  <td className="py-1 pr-2 tabular-nums">
                    {r.quantityPerHour.toLocaleString()}
                  </td>
                  <td className="py-1 pr-2 tabular-nums">{r.sourcePinId}</td>
                  <td className="py-1 tabular-nums">{r.destinationPinId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
