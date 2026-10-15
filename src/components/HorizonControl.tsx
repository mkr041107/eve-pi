"use client";

type Props = {
  hours: number;
  onChange: (hours: number) => void;
  loading?: boolean;
};

const PRESETS = [6, 24, 72];

export function HorizonControl({ hours, onChange, loading }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm text-zinc-400">
        Forecast horizon (hours)
        <input
          type="number"
          min={1}
          max={336}
          value={hours}
          disabled={loading}
          onChange={(e) => onChange(Number(e.target.value))}
          className="ml-2 w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
        />
      </label>
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={loading}
            onClick={() => onChange(p)}
            className="rounded bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700 disabled:opacity-50"
          >
            {p}h
          </button>
        ))}
      </div>
    </div>
  );
}
