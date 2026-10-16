import path from 'node:path';
import type { Brief } from '../mail/brief-parser';
import { defaultCompose, greeting, ownerOf, type Compose } from '../mail/compose';
import type { OutgoingMail } from '../mail/types';
import type { Delivery, DemoProject } from './catalog';

function minutes(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** The subject of the mail that hands a film back, so the Creator can tell the versions apart. */
export function filmSubject(brief: Pick<Brief, 'movieTitle' | 'scope'>, delivery: Pick<Delivery, 'version' | 'label'>): string {
  return `[Studio] Giao phim "${brief.movieTitle}" (${brief.scope}) - ${delivery.label} ${delivery.version}`;
}

/**
 * The mail that hands a prepared film back to the Creator named in the brief: a download link per episode and
 * the script. The Creator downloads the films outside the platform and uploads them as Submissions.
 */
export function composeFilmMail(input: {
  brief: Brief;
  project: DemoProject;
  delivery: Delivery;
  script: Buffer | null;
  studioName: string;
  /** The envelope the studio wrote; the brief's contact and co-senders otherwise. */
  compose?: Compose;
}): OutgoingMail {
  const { brief, project, delivery, script, studioName } = input;
  const envelope = input.compose ?? defaultCompose(brief, filmSubject(brief, delivery));
  const lines = delivery.episodes.map((episode, i) =>
    [`Tập ${i + 1} - ${episode.title} (${minutes(episode.durationSeconds)})`, ownerOf(brief, i + 1), `Tải về: ${episode.url}`]
      .filter(Boolean)
      .join('\n  '),
  );
  const text = [
    greeting(brief, envelope.to),
    '',
    `${studioName} gửi lại phim "${brief.movieTitle}" (${brief.scope}) theo đơn đặt hàng của AI Cinema.`,
    `${delivery.label} (${delivery.version}): ${delivery.summary}`,
    '',
    ...lines.flatMap((line) => [line, '']),
    script ? 'Kịch bản đính kèm theo thư này.' : null,
    'Vui lòng tải phim về, cập nhật mốc tiến độ và tải từng tập lên hệ thống AI Cinema (Submission).',
    '',
    `Trân trọng,\n${studioName}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return {
    ...envelope,
    text,
    attachments: script ? [{ filename: path.basename(project.script), content: script, contentType: 'text/plain; charset=utf-8' }] : [],
  };
}