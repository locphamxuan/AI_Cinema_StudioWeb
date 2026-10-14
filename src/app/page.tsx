import { AccessGate } from '@/components/AccessGate';
import { BriefList } from '@/components/BriefList';
import { Guarded, PageTitle } from '@/components/common';
import { RefreshButton } from '@/components/RefreshButton';
import { createServices, listBriefs } from '@/lib/studio';

export const dynamic = 'force-dynamic';

export default function InboxPage() {
  return (
    <AccessGate>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle title="Hộp thư đến" description="Đơn đặt hàng AI Cinema gửi cho Studio qua email: brief PDF, kịch bản và tài liệu tham khảo." />
        <RefreshButton />
      </div>
      <Guarded load={async () => <BriefList rows={await listBriefs(createServices())} />} />
    </AccessGate>
  );
}
