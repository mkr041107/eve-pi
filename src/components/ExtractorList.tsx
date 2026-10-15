type Extractor = {
  pinId: number;
  expiryTime?: string;
  remainingHours: number | null;
  status: string;
  productTypeId?: number;
};

export function ExtractorList({ extractors }: { extractors: Extractor[] }) {
  if (extractors.length === 0) {
    return <p className="text-sm text-zinc-500">No extractors on this colony.</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {extractors.map((ex) => (
        <li
          key={ex.pinId}
          className="flex flex-wrap justify-between gap-2 rounded border border-zinc-800 px-3 py-2"
        >
          <span>Extractor #{ex.pinId}</span>
          <span className="text-zinc-400">
            {ex.status === "expired"
              ? "Expired — reprogram in client"
              : ex.remainingHours !== null
                ? `${ex.remainingHours.toFixed(1)} h left`
                : "Unknown"}
          </span>
        </li>
      ))}
    </ul>
  );
}
