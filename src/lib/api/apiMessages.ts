import pairs from './api-messages.vi.json';

/**
 * Vietnamese for the messages of the AI Cinema API, which answers in English. A `{}` in an English key stands
 * for a value the API fills in (a status, an amount, a name) and `{1}`, `{2}`… put it back into the Vietnamese.
 * The same two files live in FE, Studio Web and Mobile; add a pair when the API gains a message.
 */
const PAIRS = pairs as [string, string][];
const EXACT = new Map(PAIRS.filter(([en]) => !en.includes('{}')));
const escape = (text: string) => text.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
const TEMPLATES = PAIRS.filter(([en]) => en.includes('{}')).map(([en, vi]) => ({
  pattern: new RegExp(`^${escape(en).split('{}').join('(.+?)')}$`),
  vi,
}));

/** Statuses and actions the API puts into its sentences ("Cannot publish while the episode is IN_REVIEW"). */
const VALUES: Record<string, string> = {
  DRAFT: 'Nháp',
  ASSIGNED: 'Đã giao',
  IN_PRODUCTION: 'Đang sản xuất',
  COMPLETED: 'Hoàn tất',
  UNDER_REVISION: 'Đang sửa tập',
  CANCELLED: 'Đã huỷ',
  AWAITING_MEDIA: 'Chờ Studio giao',
  PROCESSING: 'Đang xử lý video',
  IN_REVIEW: 'Chờ duyệt',
  CHANGES_REQUESTED: 'Yêu cầu sửa',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  LABELED: 'Đã gắn nhãn AI',
  COMPLIANCE_PASSED: 'Đạt kiểm tra tuân thủ',
  SCHEDULED: 'Đã lên lịch',
  PUBLISHED: 'Đã phát hành',
  UNPUBLISHED: 'Đã gỡ',
  SUBMITTED: 'Đã nộp',
  REVIEWER_APPROVED: 'Reviewer đã duyệt',
  REVISION_REQUESTED: 'Cần sửa',
  FINAL: 'Kịch bản Final',
  SENT: 'Đã gửi Studio',
  STUDIO_SIGNED: 'Studio đã ký',
  ADMIN_COUNTERED: 'Admin đề xuất giá mới',
  SIGNED: 'Đã ký đủ hai bên',
  SUPERSEDED: 'Đã thay bằng bản mới',
  OPEN: 'Đang mở',
  RESOLVED: 'Đã xử lý',
  DISMISSED: 'Đã bỏ qua',
  'add a season': 'thêm mùa phim',
  'add an episode': 'thêm tập',
  'add idea files': 'thêm tệp ý tưởng',
  'answer with another price': 'trả lời bằng giá khác',
  'assign an episode': 'giao tập',
  'cancel the project': 'huỷ dự án',
  'change the poster': 'đổi poster',
  'change the studio': 'đổi Studio',
  'change the target duration': 'đổi thời lượng mục tiêu',
  'change the thumbnail': 'đổi ảnh thu nhỏ',
  'check compliance': 'kiểm tra tuân thủ',
  counter: 'đề xuất giá mới cho',
  countersign: 'ký xác nhận',
  'delegate episodes': 'giao lại tập',
  'deliver media': 'nộp phim',
  'edit a season': 'sửa mùa phim',
  'edit an episode': 'sửa tập',
  'label media': 'gắn nhãn bản phim',
  'move the deadline': 'dời hạn giao',
  'process media': 'xử lý bản phim',
  publish: 'phát hành',
  'remove idea files': 'xoá tệp ý tưởng',
  'review media': 'duyệt bản phim',
  'review this version': 'duyệt bản này',
  'send a change request': 'gửi yêu cầu chỉnh sửa',
  'send a note on an episode': 'gửi ghi chú cho tập',
  'send a note': 'gửi ghi chú',
  sign: 'ký',
  unpublish: 'gỡ',
};

const valueOf = (value: string) =>
  value
    .split(/( or |, )/)
    .map((part) => (part === ' or ' ? ' hoặc ' : (VALUES[part] ?? part)))
    .join('');

/** The Vietnamese wording of one API message, or undefined when there is none. */
export function vietnameseApiMessage(message: string): string | undefined {
  const text = message.trim().replace(/\.$/, '');
  const exact = EXACT.get(text);
  if (exact) return exact;
  for (const { pattern, vi } of TEMPLATES) {
    const match = pattern.exec(text);
    if (match) return vi.replace(/\{(\d)\}/g, (_, n: string) => valueOf(match[Number(n)] ?? ''));
  }
  return undefined;
}

const VIETNAMESE_LETTER = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;

/** The message in Vietnamese: translated, kept when it already is Vietnamese, else `fallback` (never English). */
export function inVietnamese(message: string, fallback: string): string {
  return vietnameseApiMessage(message) ?? (VIETNAMESE_LETTER.test(message) ? message : fallback);
}
