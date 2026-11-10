import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EpisodeCard } from '@/components/EpisodeCard';
import { Badge, CARD, EmptyNote, ErrorCard, Facts, Guarded, PageTitle } from '@/components/ui';
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE, hasSignedContract } from '@/lib/domain/contract';
import { PROJECT_STATUS_LABEL } from '@/lib/domain/episode';
import { formatDateTime, formatVnd } from '@/lib/format';
import { pagePortal } from '@/lib/session/server';

export const metadata = { title: 'Chi tiết dự án - Studio Web' };

async function Project({ projectId }: { projectId: string }) {
  const project = await (await pagePortal()).project(projectId);
  const signed = hasSignedContract(project.contracts);
  const latest = [...project.contracts].sort((a, b) => b.round - a.round)[0];
  return (
    <>
      <PageTitle title={project.title} description={PROJECT_STATUS_LABEL[project.status] ?? project.status} />
      {!signed && (
        <ErrorCard message="Hợp đồng chưa được ký đủ hai bên: Studio chỉ được nhận và nộp phim sau khi hợp đồng hoàn tất." />
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <section className={`${CARD} space-y-3.5 p-6`}>
          <h2 className="text-base font-bold">Thông tin dự án</h2>
          <Facts
            items={[
              ['Ý tưởng', <span key="idea" className="whitespace-pre-line font-normal">{project.ideaDescription}</span>],
              ['Tóm tắt', project.synopsis ?? '-'],
              ['Độ tuổi', project.ageRating ?? '-'],
              ['Ngôn ngữ', project.defaultLanguage ?? '-'],
              ['Bàn giao', project.handedOffAt ? formatDateTime(project.handedOffAt) : 'Chưa bàn giao'],
            ]}
          />
        </section>
        <section className={`${CARD} space-y-3.5 p-6`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold">Hợp đồng</h2>
            <Link href="/contracts" className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-foreground/5">
              Xem các vòng
            </Link>
          </div>
          {latest ? (
            <Facts
              items={[
                ['Trạng thái', <Badge key="s" tone={CONTRACT_STATUS_TONE[latest.status]}>{CONTRACT_STATUS_LABEL[latest.status]}</Badge>],
                ['Vòng', String(latest.round)],
                ['Giá sản xuất', <span key="cost" className="font-mono font-bold">{formatVnd(latest.costVnd)}</span>],
              ]}
            />
          ) : (
            <p className="text-sm text-muted">Chưa có hợp đồng.</p>
          )}
        </section>
      </div>
      <section className={`${CARD} p-6`}>
        <h2 className="text-base font-bold">Kịch bản Final</h2>
        {project.finalScript ? (
          <details className="mt-2.5 text-sm">
            <summary className="cursor-pointer font-semibold text-foreground hover:underline">Phiên bản {project.finalScript.version} – bấm để xem toàn văn</summary>
            <pre className="mt-3 max-h-[32rem] overflow-auto rounded-2xl border border-border bg-background p-4 font-sans whitespace-pre-wrap leading-relaxed">
              {project.finalScript.content}
            </pre>
          </details>
        ) : (
          <p className="mt-1 text-sm text-muted">Kịch bản chưa được Admin duyệt Final.</p>
        )}
      </section>
      <section className={`${CARD} overflow-hidden`}>
        <h2 className="border-b border-border px-6 py-4 text-base font-bold">Danh sách tập ({project.episodes.length})</h2>
        {project.episodes.length ? (
          <div className="divide-y divide-border">
            {project.episodes.map((episode) => (
              <EpisodeCard key={episode.id} projectId={project.id} episode={episode} contractSigned={signed} />
            ))}
          </div>
        ) : (
          <div className="p-4">
            <EmptyNote>Dự án chưa có tập nào.</EmptyNote>
          </div>
        )}
      </section>
    </>
  );
}

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <>
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tất cả dự án
      </Link>
      <Guarded load={() => Project({ projectId })} />
    </>
  );
}
