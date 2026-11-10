import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ContractRound } from '@/components/ContractRound';
import { BUTTON_GHOST, CARD, EmptyNote, Guarded, PageTitle } from '@/components/ui';
import { groupByProject } from '@/lib/domain/contract';
import { pagePortal } from '@/lib/session/server';

export const metadata = { title: 'Hợp đồng - Studio Web' };

async function Contracts() {
  const contracts = await (await pagePortal()).contracts();
  if (!contracts.length) return <EmptyNote>AI Cinema chưa gửi hợp đồng nào cho Studio.</EmptyNote>;
  return (
    <div className="space-y-5">
      {groupByProject(contracts).map(({ projectId, title, rounds }) => (
        <section key={projectId} className={`${CARD} overflow-hidden transition-shadow hover:shadow-md`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h2 className="text-base font-bold">{title}</h2>
            <Link href={`/projects/${projectId}`} className={`${BUTTON_GHOST} px-3.5 py-1.5 text-xs`}>
              Xem dự án <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {rounds.map((contract, index) => (
              <ContractRound key={contract.id} contract={contract} withActions={index === 0} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ContractsPage() {
  return (
    <>
      <PageTitle
        title="Hợp đồng"
        description="Điền giá và ký hợp đồng mẫu, hoặc đồng ý / đề xuất lại giá Admin đưa ra. Hợp đồng hoàn tất khi đủ hai chữ ký."
      />
      <Guarded load={() => Contracts()} />
    </>
  );
}
