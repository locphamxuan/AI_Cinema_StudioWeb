import { Download, FileDown } from 'lucide-react';
import { ContractActions } from './ContractActions';
import { Badge, BUTTON, Facts } from './ui';
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  contractActions,
  DOCUMENT_LABEL,
  documentHref,
} from '@/lib/domain/contract';
import { formatDateTime, formatVnd } from '@/lib/format';
import type { Contract } from '@/lib/api/types';

const PROPOSER: Record<'ADMIN' | 'STUDIO', string> = { ADMIN: 'Admin AI Cinema', STUDIO: 'Studio' };

const SIGNING_STEPS = [
  'Tải hợp đồng chưa ký về và đọc kỹ: tên phim, danh sách tập, hạn giao và ngân sách đã được điền sẵn.',
  'Ký, đóng dấu phần Bên B (Studio) trên chính file đó.',
  'Tải bản PDF đã ký lên bên dưới. Admin ký phần Bên A, hệ thống ghép thành bản đủ hai chữ ký.',
];

const LINK = 'inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-accent';

function signature(at: string | null, by?: string | null) {
  if (!at) return <span className="text-muted font-normal">Chưa ký</span>;
  return `Đã ký lúc ${formatDateTime(at)}${by ? ` (${by})` : ''}`;
}

/** One round of the negotiation: its value and budget, the PDFs, the signatures and what the studio may do on it. */
export function ContractRound({ contract, withActions = true }: { contract: Contract; withActions?: boolean }) {
  const actions = withActions ? contractActions(contract.status) : [];
  const awaitingFirstSignature = contract.status === 'SENT' && actions.length > 0;
  return (
    <article className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted">Vòng {contract.round}</h3>
        <Badge tone={CONTRACT_STATUS_TONE[contract.status]}>{CONTRACT_STATUS_LABEL[contract.status] ?? contract.status}</Badge>
      </div>
      <Facts
        items={[
          [
            'Giá trị hợp đồng',
            <span key="value" className="font-mono text-base font-bold">{formatVnd(contract.costVnd ?? contract.budgetVnd)}</span>,
          ],
          ['Ngân sách trần', <span key="budget" className="font-mono">{formatVnd(contract.budgetVnd)}</span>],
          ['Bên đề xuất giá', contract.proposedBy ? PROPOSER[contract.proposedBy] : 'Theo ngân sách của AI Cinema'],
          ['Chữ ký Studio', signature(contract.studioSignedAt)],
          ['Chữ ký Admin', signature(contract.adminSignedAt, contract.adminSignedBy?.fullName)],
          ['Gửi lúc', formatDateTime(contract.createdAt)],
        ]}
      />
      {awaitingFirstSignature && (
        <ol className="list-decimal space-y-1.5 rounded-2xl border border-accent/40 bg-accent/5 p-4 pl-9 text-sm leading-relaxed">
          {SIGNING_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <a href={documentHref(contract.id, 'TEMPLATE')} className={awaitingFirstSignature ? BUTTON : LINK} download>
          <Download className="h-4 w-4" aria-hidden="true" />
          Tải hợp đồng chưa ký (PDF)
        </a>
        {contract.documents?.map((document) => (
          <a key={document.id} href={documentHref(contract.id, document.side)} className={LINK} download>
            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
            {DOCUMENT_LABEL[document.side]}
          </a>
        ))}
      </div>
      <details className="rounded-2xl border border-border bg-background p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Ghi chú điều khoản</summary>
        <p className="mt-2.5 whitespace-pre-line leading-relaxed text-muted">{contract.terms}</p>
      </details>
      {actions.length > 0 && (
        <ContractActions contractId={contract.id} actions={actions} adminCost={contract.costVnd} budgetVnd={contract.budgetVnd} />
      )}
    </article>
  );
}
