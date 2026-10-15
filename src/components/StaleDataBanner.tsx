export function StaleDataBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
      role="status"
    >
      {message}
    </div>
  );
}
