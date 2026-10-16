import { filmSubject } from './demo/film-mail';
import { filmUrl, type StoredFilm } from './films';
import { formatBytes } from './format';
import type { Brief } from './mail/brief-parser';
import type { OutgoingMail } from './mail/types';

/** One episode of the order and the video the studio uploaded for it. */
export interface UploadedEpisode {
  /** 1-based position in the order. */
  episode: number;
  film: StoredFilm;
}

export interface UploadDelivery {
  version: string;
  label: string;
  /** Free text from the studio to the Creator; may be empty. */
  note: string;
  episodes: UploadedEpisode[];
}

/**
 * What an ordered episode is called: a one-episode order of season N is the whole part N (a feature film or its
 * sequel), anything else counts episodes within the order.
 */
export function partName(brief: Pick<Brief, 'scope' | 'episodeCount'>, episode: number): string {
  if (brief.episodeCount === 1) {
    const season = /^Mùa\s+(\d+)$/u.exec(brief.scope.trim());
    return season ? `Phần ${season[1]} (trọn bộ)` : 'Phim trọn bộ';
  }
  return `Tập ${episode}`;
}

/** The mail that hands the uploaded videos to the Creator named in the brief: one download link per episode. */
export function composeUploadMail(input: {
  brief: Brief;
  delivery: UploadDelivery;
  studioName: string;
  publicUrl: string;
}): OutgoingMail {
  const { brief, delivery, studioName, publicUrl } = input;
  const ordered = [...delivery.episodes].sort((a, b) => a.episode - b.episode);
  const missing = brief.episodeCount - ordered.length;
  const lines = ordered.map(
    ({ episode, film }) =>
      `${partName(brief, episode)} - ${film.fileName} (${formatBytes(film.sizeBytes)})\n  Tải về: ${filmUrl(publicUrl, film)}`,
  );
  const text = [
    `Chào ${brief.contactName},`,
    '',
    `${studioName} gửi phim "${brief.movieTitle}" (${brief.scope}) theo đơn đặt hàng của AI Cinema.`,
    `${delivery.label} (${delivery.version}): ${ordered.length}/${brief.episodeCount} tập.`,
    missing > 0 ? `Còn ${missing} tập Studio sẽ gửi ở thư sau.` : null,
    delivery.note.trim() ? `\nLời nhắn của Studio:\n${delivery.note.trim()}` : null,
    '',
    ...lines.flatMap((line) => [line, '']),
    'Video định dạng MP4/MOV: tải về rồi tải lên AI Cinema bằng "Tải file" ở bước Submission của từng tập.',
    'Vui lòng cập nhật mốc tiến độ của Studio trên AI Cinema sau khi nhận phim.',
    '',
    `Trân trọng,\n${studioName}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return { to: brief.contactEmail, subject: filmSubject(brief, delivery), text, attachments: [] };
}
