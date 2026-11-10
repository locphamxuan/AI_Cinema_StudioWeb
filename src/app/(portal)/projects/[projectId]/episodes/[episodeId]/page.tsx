import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SubmitFilmForm } from '@/components/SubmitFilmForm';
import { CARD, ErrorCard, Guarded, PageTitle } from '@/components/ui';
import { hasSignedContract } from '@/lib/domain/contract';
import { canSubmit, EPISODE_STATUS_LABEL } from '@/lib/domain/episode';
import { formatDate, formatDuration } from '@/lib/format';
import { pagePortal } from '@/lib/session/server';

export const metadata = { title: 'Nộp phim - Studio Web' };

async function Submit({ projectId, episodeId }: { projectId: string; episodeId: string }) {
  const project = await (await pagePortal()).project(projectId);
  const episode = project.episodes.find((item) => item.id === episodeId);
  if (!episode) return <ErrorCard message="Không tìm thấy tập này trong dự án." />;
  const check = canSubmit(hasSignedContract(project.contracts), episode.status);
  const changeRequest = episode.latestDelivery?.changeRequest;
  return (
    <>
      <PageTitle
        title={`Nộp phim – Tập ${episode.episodeNumber}: ${episode.title}`}
        description={`${project.title} · ${EPISODE_STATUS_LABEL[episode.status] ?? episode.status} · Hạn giao ${formatDate(
          episode.deliveryDeadline ?? episode.dueDate,
        )} · Thời lượng mục tiêu ${formatDuration(episode.targetDurationSeconds)}`}
      />
      {changeRequest && (
        <section className="space-y-1.5 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm dark:border-red-500/30 dark:bg-red-500/10">
          <h2 className="font-bold text-red-700 dark:text-red-300">Yêu cầu sửa của Reviewer</h2>
          <p className="whitespace-pre-line">{changeRequest.comments || 'Không có ghi chú.'}</p>
        </section>
      )}
      {check.allowed ? (
        <section className={`${CARD} p-6`}>
          <SubmitFilmForm projectId={project.id} episodeId={episode.id} />
        </section>
      ) : (
        <ErrorCard message={check.reason} />
      )}
    </>
  );
}

export default async function SubmitPage({ params }: { params: Promise<{ projectId: string; episodeId: string }> }) {
  const { projectId, episodeId } = await params;
  return (
    <>
      <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Về dự án
      </Link>
      <Guarded load={() => Submit({ projectId, episodeId })} />
    </>
  );
}
