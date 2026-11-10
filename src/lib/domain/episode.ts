import type { Delivery, EpisodeStatus, IngestStatus, ProjectStatus } from '@/lib/api/types';

export const EPISODE_STATUS_LABEL: Record<EpisodeStatus, string> = {
  DRAFT: 'Chưa bàn giao',
  AWAITING_MEDIA: 'Chờ Studio nộp phim',
  PROCESSING: 'Đang xử lý video',
  IN_REVIEW: 'Reviewer đang duyệt',
  CHANGES_REQUESTED: 'Reviewer yêu cầu sửa',
  APPROVED: 'Đã duyệt',
  LABELED: 'Đã gắn nhãn AI',
  COMPLIANCE_PASSED: 'Đạt kiểm tra tuân thủ',
  SCHEDULED: 'Đã hẹn giờ phát hành',
  PUBLISHED: 'Đã phát hành',
  UNPUBLISHED: 'Đã gỡ',
};

export const INGEST_STATUS_LABEL: Record<IngestStatus, string> = {
  PENDING: 'Đang chờ xử lý',
  DOWNLOADING: 'Đang tải về',
  TRANSCODING: 'Đang chuyển mã',
  VALIDATING: 'Đang kiểm tra',
  READY: 'Sẵn sàng',
  FAILED: 'Lỗi xử lý',
  SUPERSEDED: 'Đã có bản mới hơn',
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: 'Nháp',
  ASSIGNED: 'Đang viết kịch bản',
  IN_PRODUCTION: 'Đang sản xuất',
  COMPLETED: 'Hoàn thành',
  UNDER_REVISION: 'Đang chỉnh sửa',
  CANCELLED: 'Đã huỷ',
};

/** Episode states in which the API accepts a (new) film from the studio. */
const SUBMITTABLE_STATUSES: readonly EpisodeStatus[] = ['AWAITING_MEDIA', 'IN_REVIEW', 'CHANGES_REQUESTED'];

export type SubmitCheck = { allowed: true } | { allowed: false; reason: string };

/** The studio delivers only after both signatures, and only while the episode waits for a film or a fix. */
export function canSubmit(contractSigned: boolean, status: EpisodeStatus): SubmitCheck {
  if (!contractSigned) return { allowed: false, reason: 'Hợp đồng chưa được ký đủ hai bên.' };
  if (!SUBMITTABLE_STATUSES.includes(status)) {
    return { allowed: false, reason: `Tập đang ở trạng thái "${EPISODE_STATUS_LABEL[status] ?? status}", chưa thể nộp phim.` };
  }
  return { allowed: true };
}

/** Only the latest delivery of an episode, once its processing failed, can be processed again (e.g. after fixing the link). */
export const canRetry = (delivery: Pick<Delivery, 'ingestStatus'> | null | undefined) => delivery?.ingestStatus === 'FAILED';
