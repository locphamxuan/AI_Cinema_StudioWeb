import Link from 'next/link';
import { ArrowRight, CalendarClock, Clapperboard } from 'lucide-react';
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
    <ul className="grid gap-4 md:grid-cols-2">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/projects/${project.id}`}
            className={`${CARD} group flex h-full flex-col justify-between gap-4 p-6 transition-all hover:-translate-y-0.5 hover:shadow-md`}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone={project.status === 'IN_PRODUCTION' ? 'done' : 'muted'}>
                  {PROJECT_STATUS_LABEL[project.status] ?? project.status}
                </Badge>
                {project.contract && (
                  <Badge tone={CONTRACT_STATUS_TONE[project.contract.status]}>
                    Hợp đồng: {CONTRACT_STATUS_LABEL[project.contract.status]}
                  </Badge>
                )}
              </div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">{project.title}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <Clapperboard className="h-3.5 w-3.5 text-muted" aria-hidden="true" /> {project.episodeCount} tập
                </span>
                {project.contract?.costVnd != null && (
                  <span className="font-mono font-semibold text-foreground">{formatVnd(project.contract.costVnd)}</span>
                )}
                {project.handedOffAt && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Bàn giao {formatDateTime(project.handedOffAt)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end border-t border-border pt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-all group-hover:bg-accent-dark dark:text-slate-900">
                Mở dự án &amp; Nộp phim <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ProjectsPage() {
  return (
    <>
      <PageTitle title="Dự án" description="Các dự án AI Cinema đã gửi hợp đồng và đang bàn giao cho Studio sản xuất." />
      <Guarded load={() => Projects()} />
    </>
  );
}
