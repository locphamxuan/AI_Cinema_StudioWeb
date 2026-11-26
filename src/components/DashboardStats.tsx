import Link from 'next/link';
import { CARD } from './ui';
import { formatVnd } from '@/lib/format';

/** One accent per contract stage, the same in the tiles, the bar and its legend (light and dark). */
export const STAGE_ACCENT = {
  todo: { bar: 'bg-amber-500', rail: 'before:bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  waiting: { bar: 'bg-sky-500', rail: 'before:bg-sky-500', text: 'text-sky-700 dark:text-sky-300' },
  signed: { bar: 'bg-emerald-500', rail: 'before:bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  producing: { bar: 'bg-violet-500', rail: 'before:bg-violet-500', text: 'text-violet-700 dark:text-violet-300' },
} as const;

export type Stage = keyof typeof STAGE_ACCENT;

export interface StatTile {
  stage: Stage;
  label: string;
  value: number;
  note: string;
  href: string;
}

/** The four counts the studio acts on, each a link to the list behind it, marked by its stage colour. */
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map(({ stage, label, value, note, href }) => (
        <Link
          key={stage}
          href={href}
          className={`${CARD} relative overflow-hidden p-4 pl-5 transition-colors before:absolute before:inset-y-0 before:left-0 before:w-1 hover:bg-subtle ${STAGE_ACCENT[stage].rail}`}
        >
          <span className="block text-sm font-medium text-muted">{label}</span>
          <span className={`mt-2 block text-3xl leading-none font-semibold tabular-nums ${value > 0 ? STAGE_ACCENT[stage].text : ''}`}>
            {value}
          </span>
          <span className="mt-1.5 block truncate text-xs text-muted">{note}</span>
        </Link>
      ))}
    </div>
  );
}

export interface ProgressPart {
  stage: Exclude<Stage, 'producing'>;
  label: string;
  value: number;
}

/**
 * Where the studio's projects stand in contracting, as one bar split by stage with an exact legend, and the value
 * of the contracts already signed by both sides.
 */
export function ContractProgress({ parts, signedValueVnd }: { parts: ProgressPart[]; signedValueVnd: number }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  return (
    <section className={`${CARD} space-y-4 p-5`} aria-labelledby="contract-progress">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="contract-progress" className="text-base font-semibold">
          Tiến độ hợp đồng
        </h2>
        <p className="text-sm text-muted">
          Đã ký đủ: <strong className="text-foreground tabular-nums">{formatVnd(signedValueVnd)}</strong>
        </p>
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted">Chưa có dự án nào được gửi hợp đồng.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={parts.map((part) => `${part.label}: ${part.value} dự án`).join(', ')}
            className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-subtle"
          >
            {parts
              .filter((part) => part.value > 0)
              .map((part) => (
                <span key={part.stage} className={STAGE_ACCENT[part.stage].bar} style={{ width: `${(part.value / total) * 100}%` }} />
              ))}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {parts.map((part) => (
              <li key={part.stage} className="flex items-center gap-2">
                <span className={`size-2.5 rounded-sm ${STAGE_ACCENT[part.stage].bar}`} aria-hidden="true" />
                <span className="text-muted">{part.label}</span>
                <span className="font-semibold tabular-nums">{part.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
