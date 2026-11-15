import { describe, expect, it } from 'vitest';
import { buildLinkBody, buildUploadForm, validateSubmission, type SubmissionInput } from '@/lib/domain/submission';

const valid = (over: Partial<SubmissionInput> = {}): SubmissionInput => ({
  method: 'UPLOAD',
  file: new File(['x'], 'tap-1.mp4', { type: 'video/mp4' }),
  url: '',
  disclosure: { aiGeneratedParts: ['video', 'voice'], noRealPersonLikeness: true, noCopyrightedMaterial: true },
  proposedLabelType: 'AI_GENERATED',
  note: ' Bản sửa ',
  ...over,
});

describe('validateSubmission', () => {
  it('accepts a complete file submission', () => {
    expect(validateSubmission(valid())).toEqual([]);
  });

  it('asks for an MP4/MOV file', () => {
    expect(validateSubmission(valid({ file: null }))).toEqual(['Vui lòng chọn tệp phim.']);
    expect(validateSubmission(valid({ file: new File(['x'], 'tap.avi') }))).toEqual(['Tệp phim phải là MP4 hoặc MOV.']);
    expect(validateSubmission(valid({ file: new File(['x'], 'TAP.MOV') }))).toEqual([]);
  });

  it('asks for an http(s) link', () => {
    expect(validateSubmission(valid({ method: 'HLS_URL', url: 'ftp://x/a.m3u8' }))).toEqual([
      'Đường dẫn phim phải là địa chỉ http(s) hợp lệ.',
    ]);
    expect(validateSubmission(valid({ method: 'REMOTE_FILE', url: 'https://cdn.studio.vn/tap-1.mp4' }))).toEqual([]);
  });

  it('requires the whole AI Disclosure and a proposed label', () => {
    const errors = validateSubmission(
      valid({
        disclosure: { aiGeneratedParts: [], noRealPersonLikeness: false, noCopyrightedMaterial: false },
        proposedLabelType: '',
      }),
    );
    expect(errors).toHaveLength(4);
  });
});

describe('request bodies', () => {
  it('sends the disclosure as JSON next to the file', () => {
    const form = buildUploadForm(valid());
    expect((form.get('file') as File).name).toBe('tap-1.mp4');
    expect(JSON.parse(String(form.get('aiDisclosure')))).toEqual({
      aiGeneratedParts: ['video', 'voice'],
      noRealPersonLikeness: true,
      noCopyrightedMaterial: true,
    });
    expect(form.get('proposedLabelType')).toBe('AI_GENERATED');
    expect(form.get('submissionNote')).toBe('Bản sửa');
  });

  it('builds a link submission', () => {
    expect(buildLinkBody(valid({ method: 'HLS_URL', url: ' https://cdn/a.m3u8 ', note: '' }))).toEqual({
      sourceMethod: 'HLS_URL',
      sourceUrl: 'https://cdn/a.m3u8',
      aiDisclosure: { aiGeneratedParts: ['video', 'voice'], noRealPersonLikeness: true, noCopyrightedMaterial: true },
      proposedLabelType: 'AI_GENERATED',
    });
  });
});
