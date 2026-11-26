import { Download } from 'lucide-react';
import { CARD, EmptyNote } from '@/components/ui';
import type { StudioIdeaFile } from '@/lib/api/types';
import { formatBytes, formatDateTime } from '@/lib/format';

const PURPOSE_LABEL: Record<StudioIdeaFile['purpose'], string> = { IDEA: 'Mô tả ý tưởng', SYNOPSIS: 'Tóm tắt nội dung' };

/** The idea and synopsis files of the project, each in its latest version. */
export function IdeaFiles({ projectId, files }: { projectId: string; files: StudioIdeaFile[] }) {
  return (
    <section className={`${CARD} overflow-hidden`}>
      <h2 className="border-b border-border px-6 py-4 text-base font-bold">Tài liệu ý tưởng ({files.length})</h2>
      {files.length ? (
        <ul className="divide-y divide-border">
          {files.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{file.fileName}</p>
                <p className="text-muted">
                  {PURPOSE_LABEL[file.purpose]} · Bản {file.version} · {formatBytes(file.sizeBytes)} ·{' '}
                  {formatDateTime(file.createdAt)}
                </p>
              </div>
              <a
                href={`/api/projects/${projectId}/idea-files/${file.id}`}
                aria-label={`Tải ${file.fileName}`}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-foreground/5"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" /> Tải xuống
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-4">
          <EmptyNote>Dự án chưa có tài liệu ý tưởng đính kèm.</EmptyNote>
        </div>
      )}
    </section>
  );
}
