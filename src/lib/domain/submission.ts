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

const VIDEO_FILE = /\.(mp4|mov)$/i;
const NOTE_MAX = 2000;

/** The same rules the API enforces (BR-41 disclosure, MP4/MOV file, http(s) link), checked before sending. */
export function validateSubmission(input: SubmissionInput): string[] {
  const errors: string[] = [];
  if (input.method === 'UPLOAD') {
    if (!input.file) errors.push('Vui lòng chọn tệp phim.');
    else if (!VIDEO_FILE.test(input.file.name)) errors.push('Tệp phim phải là MP4 hoặc MOV.');
  } else {
    let valid = false;
    try {
      valid = ['http:', 'https:'].includes(new URL(input.url.trim()).protocol);
    } catch {
      valid = false;
    }
    if (!valid) errors.push('Đường dẫn phim phải là địa chỉ http(s) hợp lệ.');
  }
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
