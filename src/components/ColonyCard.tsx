import { ExtractorList } from "./ExtractorList";
import { ImportExportTable } from "./ImportExportTable";

type Colony = {
  planetId: number;
  planetName: string;
  solarSystemId: number;
  solarSystemName: string;
  planetType: string;
  planetTypeLabel: string;
  lastFetchedAt?: string;
  grossFactoryInputs: { typeId: number; name: string; quantity: number }[];
  netImports: { typeId: number; name: string; quantity: number }[];
  exports: { typeId: number; name: string; quantity: number }[];
  extractors: {
    pinId: number;
    expiryTime?: string;
    remainingHours: number | null;
    status: string;
    productTypeId?: number;
  }[];
};

export function ColonyCard({ colony }: { colony: Colony }) {
  return (
    <details className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4" open>
      <summary className="cursor-pointer font-medium">
        {colony.planetName} · {colony.planetTypeLabel} · {colony.solarSystemName}
        {colony.lastFetchedAt && (
          <span className="ml-2 text-xs font-normal text-zinc-500">
            layout cached {new Date(colony.lastFetchedAt).toLocaleString()}
          </span>
        )}
      </summary>
      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ImportExportTable
          title="Factory inputs required (all tiers)"
          rows={colony.grossFactoryInputs}
          emptyLabel="No active factory schematics detected."
        />
        <ImportExportTable
          title="Net orbit imports needed"
          rows={colony.netImports}
          emptyLabel="No net imports required for this horizon."
        />
        <ImportExportTable
          title="Exports to launch pad"
          rows={colony.exports}
          emptyLabel="No exports forecast for this horizon."
        />
      </div>
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-medium text-zinc-300">Extractors</h3>
        <ExtractorList extractors={colony.extractors} />
      </div>
    </details>
  );
}
