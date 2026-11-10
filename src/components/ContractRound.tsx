import { Badge, Facts } from './ui';
import { ContractActions } from './ContractActions';
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE, contractActions } from '@/lib/domain/contract';
import { formatDateTime, formatVnd } from '@/lib/format';
import type { Contract } from '@/lib/api/types';

const PROPOSER: Record<'ADMIN' | 'STUDIO', string> = { ADMIN: 'Admin AI Cinema', STUDIO: 'Studio' };

function signature(at: string | null, by?: string | null) {
  if (!at) return <span className="text-muted">Chưa ký</span>;
  return `Đã ký lúc ${formatDateTime(at)}${by ? ` (${by})` : ''}`;
}

/** One round of the negotiation: its cost, terms and signatures, and what the studio may do on it. */
export function ContractRound({ contract, withActions = true }: { contract: Contract; withActions?: boolean }) {
  const actions = withActions ? contractActions(contract.status) : [];
  return (
    <article className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Vòng {contract.round}</h3>
        <Badge tone={CONTRACT_STATUS_TONE[contract.status]}>{CONTRACT_STATUS_LABEL[contract.status] ?? contract.status}</Badge>
      </div>
      <Facts
        items={[
          ['Giá sản xuất', <span key="cost" className="text-base">{formatVnd(contract.costVnd)}</span>],
          ['Bên đề xuất giá', contract.proposedBy ? PROPOSER[contract.proposedBy] : '-'],
          ['Chữ ký Studio', signature(contract.studioSignedAt)],
          ['Chữ ký Admin', signature(contract.adminSignedAt, contract.adminSignedBy?.fullName)],
          ['Gửi lúc', formatDateTime(contract.createdAt)],
        ]}
      />
      <details className="rounded-lg border border-border bg-background p-3 text-sm" open={actions.length > 0}>
        <summary className="cursor-pointer font-medium">Điều khoản hợp đồng</summary>
        <p className="mt-2 whitespace-pre-line text-muted">{contract.terms}</p>
      </details>
      {actions.length > 0 && <ContractActions contractId={contract.id} actions={actions} adminCost={contract.costVnd} />}
    </article>
  );
}
