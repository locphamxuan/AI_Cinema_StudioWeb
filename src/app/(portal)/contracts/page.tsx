import Link from 'next/link';
import { ContractRound } from '@/components/ContractRound';
import { CARD, EmptyNote, Guarded, PageTitle } from '@/components/ui';
import { groupByProject } from '@/lib/domain/contract';
import { pagePortal } from '@/lib/session/server';

export const metadata = { title: 'Hợp đồng - Studio Web' };

async function Contracts() {
  const contracts = await (await pagePortal()).contracts();
  if (!contracts.length) return <EmptyNote>AI Cinema chưa gửi hợp đồng nào cho Studio.</EmptyNote>;
  return (
    <div className="space-y-4">
      {groupByProject(contracts).map(({ projectId, title, rounds }) => (
        <section key={projectId} className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="font-semibold">{title}</h2>
            <Link href={`/projects/${projectId}`} className="text-sm text-accent hover:underline">
              Xem dự án
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
