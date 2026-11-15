/** Shown while a portal page loads its data from AI Cinema; same frame as the page so nothing jumps. */
export default function PortalLoading() {
  const block = 'rounded-3xl border border-border bg-card motion-safe:animate-pulse';
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">Đang tải dữ liệu…</span>
      <div className="h-8 w-56 rounded-full bg-foreground/10 motion-safe:animate-pulse" aria-hidden="true" />
      <div className="grid gap-5 md:grid-cols-3" aria-hidden="true">
        <div className={`${block} h-36`} />
        <div className={`${block} h-36`} />
        <div className={`${block} h-36`} />
      </div>
      <div className={`${block} h-64`} aria-hidden="true" />
    </div>
  );
}
