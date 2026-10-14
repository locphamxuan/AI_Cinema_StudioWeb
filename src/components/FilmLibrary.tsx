import { FileText } from 'lucide-react';
import type { DemoCatalog, DemoProject } from '@/lib/demo/catalog';
import { formatDuration } from '@/lib/format';
import { CARD } from './common';

function ProjectCard({ project, general }: { project: DemoProject; general?: boolean }) {
  return (
    <section className={`${CARD} space-y-3 p-5`} aria-label={project.title}>
      <div>
        <h2 className="text-lg font-semibold">
          {project.title}
          {general && <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-normal">dùng cho dự án chưa có phim riêng</span>}
        </h2>
        <p className="text-sm text-muted">{project.synopsis}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Kịch bản: {project.script}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {project.deliveries.map((delivery) => (
          <div key={delivery.version} className="rounded-lg border border-border p-3 text-sm">
            <p className="font-semibold">
              {delivery.label} ({delivery.version})
            </p>
            <p className="mb-2 text-muted">{delivery.summary}</p>
            <ol className="space-y-0.5">
              {delivery.episodes.map((episode, i) => (
                <li key={`${episode.url}-${i}`} className="flex justify-between gap-3">
                  <span className="truncate">
                    Tập {i + 1} — {episode.title}
                  </span>
                  <span className="shrink-0 text-muted">{formatDuration(episode.durationSeconds)}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The films the studio prepared for the demo, per project and version: what "Gửi lại phim" can hand back. */
export function FilmLibrary({ catalog }: { catalog: DemoCatalog }) {
  return (
    <div className="space-y-4">
      {catalog.projects.map((project) => (
        <ProjectCard key={project.title} project={project} />
      ))}
      <ProjectCard project={catalog.generic} general />
    </div>
  );
}
