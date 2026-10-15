"use client";

import { useState } from "react";

type Props = {
  onSubmit: (input: {
    typeId: number;
    amount: number;
    planetId?: number;
    note?: string;
  }) => Promise<void>;
};

export function ManualStockForm({ onSubmit }: Props) {
  const [typeId, setTypeId] = useState("");
  const [amount, setAmount] = useState("");
  const [planetId, setPlanetId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        typeId: Number(typeId),
        amount: Number(amount),
        planetId: planetId ? Number(planetId) : undefined,
        note: note || undefined,
      });
      setTypeId("");
      setAmount("");
      setPlanetId("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-zinc-800 p-4">
      <h3 className="font-medium">Log imported materials</h3>
      <p className="text-xs text-zinc-500">
        Burn rate is taken from your current factory layout. Empty time is stored
        in this browser.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Type ID
          <input
            required
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Amount
          <input
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Planet ID (optional)
          <input
            value={planetId}
            onChange={(e) => setPlanetId(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Note
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-cyan-800 px-4 py-2 text-sm font-medium hover:bg-cyan-700 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save stock timer"}
      </button>
    </form>
  );
}
