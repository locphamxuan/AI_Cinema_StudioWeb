import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge, CARD, EmptyNote, Guarded, PageTitle } from '@/components/ui';
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE } from '@/lib/domain/contract';
import { PROJECT_STATUS_LABEL } from '@/lib/domain/episode';
import { formatDateTime, formatVnd } from '@/lib/format';
import { pagePortal } from '@/lib/session/server';

export const metadata = { title: 'Dự án - Studio Web' };

async function Projects() {
  const projects = await (await pagePortal()).projects();
  if (!projects.length) return <EmptyNote>Studio chưa có dự án nào.</EmptyNote>;
  return (
    <ul className={`${CARD} divide-y divide-border`}>
      {projects.map((project) => (
        <li key={project.id}>
          <Link href={`/projects/${project.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/5">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-semibold">{project.title}</p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <Badge tone={project.status === 'IN_PRODUCTION' ? 'done' : 'muted'}>
                  {PROJECT_STATUS_LABEL[project.status] ?? project.status}
                </Badge>
                {project.contract && (
                  <Badge tone={CONTRACT_STATUS_TONE[project.contract.status]}>
                    Hợp đồng: {CONTRACT_STATUS_LABEL[project.contract.status]}
                  </Badge>
                )}
                <span>{project.episodeCount} tập</span>
                {project.contract?.costVnd != null && <span>· {formatVnd(project.contract.costVnd)}</span>}
                {project.handedOffAt && <span>· Bàn giao {formatDateTime(project.handedOffAt)}</span>}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ProjectsPage() {
  return (
    <>
      <PageTitle title="Dự án" description="Các dự án AI Cinema đã gửi hợp đồng cho Studio." />
      <Guarded load={() => Projects()} />
    </>
  );
}
