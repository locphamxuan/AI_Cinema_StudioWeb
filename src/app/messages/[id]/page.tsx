import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AccessGate } from '@/components/AccessGate';
import { BriefDetail } from '@/components/BriefDetail';
import { Guarded } from '@/components/common';
import { createServices, getBrief } from '@/lib/studio';

export const dynamic = 'force-dynamic';

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AccessGate>
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Hộp thư đến
      </Link>
      <Guarded
        load={async () => {
          const services = createServices();
          return <BriefDetail row={await getBrief(services, id)} catalog={await services.catalog()} />;
        }}
      />
    </AccessGate>
  );
}
