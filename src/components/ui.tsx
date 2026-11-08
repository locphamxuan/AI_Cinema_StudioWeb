import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { unstable_rethrow } from 'next/navigation';
import { describeError } from '@/lib/api/http';

export const CARD = 'rounded-xl border border-border bg-card';
export const BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-950';
export const BUTTON_GHOST =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-60';
export const INPUT =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

export function ErrorCard({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="break-words">{message}</span>
    </div>
  );
}

export function SuccessCard({ message }: { message: string }) {
  return (
    <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">{children}</p>;
}

export function PageTitle({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

const TONES = {
  action: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200',
  waiting: 'bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200',
  done: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200',
  danger: 'bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200',
  muted: 'bg-foreground/5 text-muted',
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

/** Label/value rows of a card. */
export function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Runs a page's data load and shows what went wrong instead of a crash. */
export async function Guarded({ load }: { load: () => Promise<React.ReactNode> }) {
  const outcome = await load().then(
    (node) => ({ node, error: null as string | null }),
    (error: unknown) => {
      // A redirect (expired session) is not an error to show.
      unstable_rethrow(error);
      return { node: null, error: describeError(error) };
    },
  );
  return outcome.error === null ? <>{outcome.node}</> : <ErrorCard message={outcome.error} />;
}
