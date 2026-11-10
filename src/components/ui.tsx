import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { unstable_rethrow } from 'next/navigation';
import { describeError } from '@/lib/api/http';

export const CARD = 'rounded-3xl border border-border bg-card shadow-xs';
export const BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-900';
export const BUTTON_GHOST =
  'inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-60';
export const INPUT =
  'w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted focus:border-accent focus:bg-card focus:ring-2 focus:ring-accent/15';

export function ErrorCard({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="break-words font-medium">{message}</span>
    </div>
  );
}

export function SuccessCard({ message }: { message: string }) {
  return (
    <div role="status" className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted">{children}</p>;
}

export function PageTitle({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted leading-relaxed">{description}</p>}
      </div>
      {children}
    </div>
  );
}

const TONES = {
  action: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300',
  waiting: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
  danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300',
  muted: 'border-border bg-foreground/5 text-muted',
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}

/** Label/value rows of a card. */
export function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-5 gap-y-2.5 text-sm sm:grid-cols-[max-content_1fr]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="font-semibold break-words">{value}</dd>
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
