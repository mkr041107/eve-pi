type Row = { typeId: number; name: string; quantity: number };

export function ImportExportTable({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: Row[];
  emptyLabel: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-zinc-300">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyLabel}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-1">Commodity</th>
              <th className="py-1 text-right">Units</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.typeId} className="border-t border-zinc-800">
                <td className="py-1">{r.name}</td>
                <td className="py-1 text-right tabular-nums">
                  {r.quantity.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
