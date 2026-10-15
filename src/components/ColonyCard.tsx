import { ExtractorList } from "./ExtractorList";
import { ImportExportTable } from "./ImportExportTable";

type Colony = {
  planetId: number;
  solarSystemId: number;
  planetType: string;
  lastFetchedAt?: string;
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
        Planet {colony.planetId} · {colony.planetType} · system{" "}
        {colony.solarSystemId}
        {colony.lastFetchedAt && (
          <span className="ml-2 text-xs font-normal text-zinc-500">
            layout cached {new Date(colony.lastFetchedAt).toLocaleString()}
          </span>
        )}
      </summary>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
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
