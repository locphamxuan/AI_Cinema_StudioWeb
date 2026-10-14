import { AlertTriangle } from 'lucide-react';

export const CARD = 'rounded-xl border border-border bg-card';

export function ErrorCard({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">{children}</p>;
}

export function PageTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold">{title}</h1>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
    </div>
  );
}

/** Runs a page's data load and shows what went wrong instead of a crash. */
export async function Guarded({ load }: { load: () => Promise<React.ReactNode> }) {
  const outcome = await load().then(
    (node) => ({ node, error: null as string | null }),
    (error: unknown) => ({ node: null, error: error instanceof Error ? error.message : 'Không tải được dữ liệu.' }),
  );
  return outcome.error === null ? <>{outcome.node}</> : <ErrorCard message={outcome.error} />;
}
