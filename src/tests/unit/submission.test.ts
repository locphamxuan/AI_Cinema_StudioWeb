import { describe, expect, it } from 'vitest';
import { buildLinkBody, buildUploadForm, FILM_MAX_BYTES, looksLikeHls, validateSubmission, type SubmissionInput } from '@/lib/domain/submission';

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
    expect(validateSubmission(valid({ file: new File(['x'], 'tap.avi') }))).toEqual(['Tệp phim phải là MP4, M4V hoặc MOV.']);
    expect(validateSubmission(valid({ file: new File(['x'], 'TAP.MOV') }))).toEqual([]);
  });

  it('decides the kind by extension like the API, whatever video type the browser reports', () => {
    for (const [name, type] of [
      ['tap.m4v', 'video/x-m4v'],
      ['tap.mp4', 'application/mp4'],
      ['tap.mov', 'video/quicktime'],
      ['tap.mp4', ''],
    ]) {
      expect(validateSubmission(valid({ file: new File(['x'], name, { type }) }))).toEqual([]);
    }
    expect(validateSubmission(valid({ file: new File(['x'], 'tap.mp4', { type: 'image/png' }) }))).toEqual([
      'Tệp phim phải là MP4, M4V hoặc MOV.',
    ]);
  });

  it('refuses an empty file, a file over 2 GB and a non-MP4/MOV extension', () => {
    expect(validateSubmission(valid({ file: new File([], 'tap.mp4', { type: 'video/mp4' }) }))).toEqual(['Tệp phim đang rỗng.']);
    const huge = new File(['x'], 'tap.mp4', { type: 'video/mp4' });
    Object.defineProperty(huge, 'size', { value: FILM_MAX_BYTES + 1 });
    expect(validateSubmission(valid({ file: huge }))).toEqual(['Tệp phim tối đa 2 GB; tệp lớn hơn hãy nộp bằng link.']);
    expect(validateSubmission(valid({ file: new File(['x'], 'tap.webm', { type: 'video/webm' }) }))).toEqual([
      'Tệp phim phải là MP4, M4V hoặc MOV.',
    ]);
  });

  it('asks for a link of at most 1000 characters, and only hints at .m3u8 for HLS', () => {
    expect(validateSubmission(valid({ method: 'REMOTE_FILE', url: '  ' }))).toEqual(['Vui lòng nhập đường dẫn phim.']);
    // The API probes the playlist itself: a link without .m3u8 is not refused here.
    expect(validateSubmission(valid({ method: 'HLS_URL', url: 'https://cdn.studio.vn/play?id=1' }))).toEqual([]);
    expect(looksLikeHls('https://cdn.studio.vn/play?id=1')).toBe(false);
    expect(looksLikeHls('https://cdn.studio.vn/tap-1/master.m3u8?sig=1')).toBe(true);
    expect(looksLikeHls('not a url')).toBe(false);
    expect(validateSubmission(valid({ method: 'HLS_URL', url: 'https://cdn.studio.vn/tap-1/master.m3u8?sig=1' }))).toEqual([]);
    expect(validateSubmission(valid({ method: 'REMOTE_FILE', url: `https://cdn.studio.vn/${'a'.repeat(1000)}.mp4` }))).toEqual([
      'Đường dẫn phim tối đa 1000 ký tự.',
    ]);
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
