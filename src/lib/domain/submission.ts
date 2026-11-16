import type { AiDisclosure, AiGeneratedPart, LabelType, MediaLinkSubmission } from '@/lib/api/types';

export const AI_PARTS: { value: AiGeneratedPart; label: string }[] = [
  { value: 'video', label: 'Hình ảnh động / video' },
  { value: 'image', label: 'Hình ảnh tĩnh' },
  { value: 'voice', label: 'Giọng nói' },
  { value: 'music', label: 'Âm nhạc' },
  { value: 'script', label: 'Lời thoại / kịch bản' },
  { value: 'subtitle', label: 'Phụ đề' },
];

export const LABEL_TYPES: { value: LabelType; label: string }[] = [
  { value: 'AI_GENERATED', label: 'Nội dung do AI tạo ra' },
  { value: 'AI_EDITED', label: 'Nội dung được chỉnh sửa bằng AI' },
  { value: 'AI_ASSISTED', label: 'AI hỗ trợ sản xuất' },
];

export type SourceMethod = 'UPLOAD' | 'REMOTE_FILE' | 'HLS_URL';

export interface SubmissionInput {
  method: SourceMethod;
  file: File | null;
  url: string;
  disclosure: AiDisclosure;
  proposedLabelType: LabelType | '';
  note: string;
}

/** The API's MP4/MOV kinds (BE `detectKind`: .mp4, .m4v, .mov); it checks the content itself by magic bytes. */
const VIDEO_FILE = /\.(mp4|m4v|mov)$/i;
/** Browsers report these films as video/*, application/mp4 or nothing at all; the extension decides. */
const videoType = (type: string) => !type || type.startsWith('video/') || type === 'application/mp4';
const NOTE_MAX = 2000;
/** The API's limit on a link (SubmitMediaLinkRequestDto.sourceUrl). */
const URL_MAX = 1000;
/** The API's default upload limit (MEDIA_MAX_UPLOAD_MB = 2048). */
export const FILM_MAX_BYTES = 2048 * 1024 * 1024;

function linkProblem(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Vui lòng nhập đường dẫn phim.';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return 'Đường dẫn phim phải là địa chỉ http(s) hợp lệ.';
  }
  if (!['http:', 'https:'].includes(url.protocol)) return 'Đường dẫn phim phải là địa chỉ http(s) hợp lệ.';
  if (value.length > URL_MAX) return `Đường dẫn phim tối đa ${URL_MAX} ký tự.`;
  return null;
}

/** A soft hint only: the API accepts any http(s) link and probes the playlist itself. */
export function looksLikeHls(raw: string): boolean {
  try {
    return /\.m3u8$/i.test(new URL(raw.trim()).pathname);
  } catch {
    return false;
  }
}

function fileProblem(file: File | null): string | null {
  if (!file) return 'Vui lòng chọn tệp phim.';
  if (!VIDEO_FILE.test(file.name) || !videoType(file.type)) return 'Tệp phim phải là MP4 hoặc MOV.';
  if (file.size === 0) return 'Tệp phim đang rỗng.';
  if (file.size > FILM_MAX_BYTES) return 'Tệp phim tối đa 2 GB; tệp lớn hơn hãy nộp bằng link.';
  return null;
}

/** The same rules the API enforces (BR-41 disclosure, MP4/M4V/MOV file up to 2 GB, http(s) link), checked before sending. */
export function validateSubmission(input: SubmissionInput): string[] {
  const errors: string[] = [];
  const source = input.method === 'UPLOAD' ? fileProblem(input.file) : linkProblem(input.url);
  if (source) errors.push(source);
  if (!input.disclosure.aiGeneratedParts.length) errors.push('Chọn ít nhất một phần có dùng AI.');
  if (!input.disclosure.noRealPersonLikeness) errors.push('Studio phải cam kết không dùng hình ảnh người thật gây hiểu lầm.');
  if (!input.disclosure.noCopyrightedMaterial) errors.push('Studio phải cam kết không dùng tư liệu có bản quyền của bên thứ ba.');
  if (!input.proposedLabelType) errors.push('Chọn loại nhãn AI đề xuất.');
  if (input.note.length > NOTE_MAX) errors.push(`Ghi chú tối đa ${NOTE_MAX} ký tự.`);
  return errors;
}

/** Body of a file submission: the API reads `aiDisclosure` as a JSON string next to the file. */
export function buildUploadForm(input: SubmissionInput): FormData {
  const form = new FormData();
  if (input.file) form.append('file', input.file);
  form.append('aiDisclosure', JSON.stringify(input.disclosure));
  form.append('proposedLabelType', input.proposedLabelType);
  if (input.note.trim()) form.append('submissionNote', input.note.trim());
  return form;
}

export function buildLinkBody(input: SubmissionInput): MediaLinkSubmission {
  return {
    sourceMethod: input.method === 'HLS_URL' ? 'HLS_URL' : 'REMOTE_FILE',
    sourceUrl: input.url.trim(),
    aiDisclosure: input.disclosure,
    proposedLabelType: input.proposedLabelType as LabelType,
    ...(input.note.trim() ? { submissionNote: input.note.trim() } : {}),
  };
}
