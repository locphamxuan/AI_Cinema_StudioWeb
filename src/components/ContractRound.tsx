import Link from 'next/link';
import { ContractActions } from './ContractActions';
import { ProfileNotice } from './ProfileNotice';
import { Badge, BUTTON, BUTTON_GHOST, CARD } from './ui';
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  contractActions,
  DOCUMENT_LABEL,
  documentHref,
  type ProjectContracts,
} from '@/lib/domain/contract';
import { formatDateTime, formatVnd } from '@/lib/format';
import type { LegalProfileField } from '@/lib/api/types';

const PROPOSER: Record<'ADMIN' | 'STUDIO', string> = { ADMIN: 'Admin AI Cinema', STUDIO: 'Studio' };

const SIGNING_STEPS = [
  'Tải hợp đồng chưa ký về và đọc kỹ: tên phim, danh sách tập, hạn giao và ngân sách đã điền sẵn.',
  'Chọn ảnh chữ ký của Studio và xem trước.',
  'Xác nhận ký. Hệ thống đặt chữ ký vào ô Bên B của chính hợp đồng đó; Admin ký Bên A sau.',
];

const LINK = `${BUTTON_GHOST} h-8 px-3 text-xs`;

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-subtle px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="truncate text-sm font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

const signedAt = (at: string | null, by?: string | null) =>
  at ? `${formatDateTime(at)}${by ? ` (${by})` : ''}` : 'Chưa ký';

/**
 * Where one project's contract stands, on one compact card: its newest round with value, budget and signatures,
 * the PDFs to download and, when the round waits for the studio, the way to sign it (or what blocks signing).
 */
export function ContractRound({
  group,
  withActions = false,
  missingProfile = [],
}: {
  group: ProjectContracts;
  withActions?: boolean;
  missingProfile?: LegalProfileField[];
}) {
  const contract = group.rounds[0];
  const actions = withActions ? contractActions(contract.status) : [];
  const waitsForStudio = actions.length > 0;
  return (
    <article aria-label={group.title} className={`${CARD} flex flex-col gap-4 p-5`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h2 className="truncate text-base font-semibold">{group.title}</h2>
          <p className="text-xs text-muted">
            Vòng {contract.round}, gửi {formatDateTime(contract.createdAt)}
          </p>
        </div>
        <Badge tone={CONTRACT_STATUS_TONE[contract.status]}>{CONTRACT_STATUS_LABEL[contract.status] ?? contract.status}</Badge>
      </header>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Giá trị hợp đồng">{formatVnd(contract.costVnd ?? contract.budgetVnd)}</Stat>
        <Stat label="Ngân sách trần">{formatVnd(contract.budgetVnd)}</Stat>
        <Stat label="Bên đề xuất giá">{contract.proposedBy ? PROPOSER[contract.proposedBy] : 'Theo ngân sách'}</Stat>
      </dl>

      <dl className="grid gap-1 text-xs sm:grid-cols-2">
        <div>
          <dt className="inline text-muted">Chữ ký Studio: </dt>
          <dd className="inline font-medium">{signedAt(contract.studioSignedAt)}</dd>
        </div>
        <div>
          <dt className="inline text-muted">Chữ ký Admin: </dt>
          <dd className="inline font-medium">{signedAt(contract.adminSignedAt, contract.adminSignedBy?.fullName)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <a href={documentHref(contract.id, 'TEMPLATE')} className={waitsForStudio ? `${BUTTON} h-8 px-3 text-xs` : LINK} download>
          Tải hợp đồng chưa ký (PDF)
        </a>
        {contract.documents?.map((document) => (
          <a key={document.id} href={documentHref(contract.id, document.side)} className={LINK} download>
            {DOCUMENT_LABEL[document.side]}
          </a>
        ))}
        <Link href={`/projects/${group.projectId}`} className="ml-auto text-xs font-semibold text-muted hover:text-foreground hover:underline">
          Xem dự án
        </Link>
      </div>

      <details className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
        <summary className="cursor-pointer text-xs font-semibold">Ghi chú điều khoản</summary>
        <p className="mt-2 whitespace-pre-line leading-relaxed text-muted">{contract.terms}</p>
      </details>

      {waitsForStudio && missingProfile.length > 0 && <ProfileNotice missing={missingProfile} />}
      {waitsForStudio && missingProfile.length === 0 && (
        <>
          {contract.status === 'SENT' && (
            <ol className="list-decimal space-y-1 rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 pl-8 text-xs leading-relaxed dark:border-amber-500/30 dark:bg-amber-500/5">
              {SIGNING_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          <ContractActions key={contract.id} contractId={contract.id} actions={actions} adminCost={contract.costVnd} budgetVnd={contract.budgetVnd} />
        </>
      )}
    </article>
  );
}
