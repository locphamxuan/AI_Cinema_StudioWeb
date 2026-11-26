import { ContractRound } from '@/components/ContractRound';
import { ContractTabs, Pagination } from '@/components/ContractTabs';
import { ProfileNotice } from '@/components/ProfileNotice';
import { QuoteHistory } from '@/components/QuoteHistory';
import { EmptyNote, ErrorCard, Guarded, PageTitle, SuccessCard } from '@/components/ui';
import {
  CONTRACT_NOTICE,
  groupByProject,
  paginate,
  tabOfProject,
  toContractNotice,
  toContractTab,
  type ContractTab,
} from '@/lib/domain/contract';
import { loadContracts, loadProfile } from '@/lib/session/portal-data';

export const metadata = { title: 'Hợp đồng - Studio Web' };

/** Cards per page: a project to sign takes room for its form, the others are compact. */
const PAGE_SIZE: Record<ContractTab, number> = { todo: 3, waiting: 6, signed: 6, history: 10 };

const EMPTY: Record<ContractTab, string> = {
  todo: 'Không có hợp đồng nào chờ Studio ký.',
  waiting: 'Không có hợp đồng nào đang chờ Admin ký.',
  signed: 'Chưa có hợp đồng nào đủ chữ ký hai bên.',
  history: 'AI Cinema chưa gửi hợp đồng nào cho Studio.',
};

async function Contracts({ tab, page }: { tab: ContractTab; page: number }) {
  const [contracts, profile] = await Promise.all([loadContracts(), loadProfile()]);
  const groups = groupByProject(contracts);
  const byTab = (key: ContractTab) => groups.filter((group) => tabOfProject(group) === key);
  const history = [...contracts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const counts = {
    todo: byTab('todo').length,
    waiting: byTab('waiting').length,
    signed: byTab('signed').length,
    history: history.length,
  };

  let content: React.ReactNode;
  if (tab === 'history') {
    const shown = paginate(history, page, PAGE_SIZE.history);
    content = shown.items.length ? (
      <>
        <QuoteHistory rounds={shown.items} />
        <Pagination tab={tab} page={shown.page} pages={shown.pages} />
      </>
    ) : (
      <EmptyNote>{EMPTY.history}</EmptyNote>
    );
  } else {
    const shown = paginate(byTab(tab), page, PAGE_SIZE[tab]);
    content = shown.items.length ? (
      <>
        <div className={tab === 'todo' ? 'grid gap-4' : 'grid gap-4 lg:grid-cols-2'}>
          {shown.items.map((group) => (
            <ContractRound
              key={group.projectId}
              group={group}
              withActions={tab === 'todo'}
              missingProfile={profile.missing}
            />
          ))}
        </div>
        <Pagination tab={tab} page={shown.page} pages={shown.pages} />
      </>
    ) : (
      <EmptyNote>{EMPTY[tab]}</EmptyNote>
    );
  }

  return (
    <div className="space-y-4">
      {!profile.complete && counts.todo > 0 && tab !== 'todo' && <ProfileNotice missing={profile.missing} />}
      <ContractTabs active={tab} counts={counts} />
      {content}
    </div>
  );
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const tab = toContractTab(params.tab);
  const page = Number(params.page ?? 1);
  const notice = toContractNotice(params.notice);
  return (
    <>
      <PageTitle title="Hợp đồng" description="Đọc hợp đồng, rồi ký bằng ảnh chữ ký hoặc đề xuất giá thấp hơn." />
      {notice &&
        (CONTRACT_NOTICE[notice].ok ? (
          <SuccessCard message={CONTRACT_NOTICE[notice].text} />
        ) : (
          <ErrorCard message={CONTRACT_NOTICE[notice].text} />
        ))}
      <Guarded load={() => Contracts({ tab, page })} />
    </>
  );
}
