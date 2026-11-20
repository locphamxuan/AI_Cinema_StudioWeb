import { describe, expect, it } from 'vitest';
import { submitFilm } from '@/lib/api/submit-film';
import type { SubmissionInput } from '@/lib/domain/submission';

type Outcome = { status: number; responseText?: string } | 'network-error';
interface Sent {
  method?: string;
  url?: string;
  headers: Record<string, string>;
  body?: unknown;
}

/** A stand-in for XMLHttpRequest answering the requests in order with the given outcomes; the last one repeats. */
function fakeXhr(outcomes: Outcome[], progress: [number, number][] = []) {
  const sent: Sent[] = [];
  class FakeXhr {
    status = 0;
    responseText = '';
    upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
      onprogress: null,
    };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private request: Sent = { headers: {} };
    open(method: string, url: string) {
      this.request = { method, url, headers: {} };
    }
    setRequestHeader(name: string, value: string) {
      this.request.headers[name] = value;
    }
    send(body: unknown) {
      this.request.body = body;
      sent.push(this.request);
      const outcome = outcomes[Math.min(sent.length - 1, outcomes.length - 1)];
      for (const [loaded, total] of progress) this.upload.onprogress?.({ lengthComputable: true, loaded, total });
      if (outcome === 'network-error') return this.onerror?.();
      this.status = outcome.status;
      this.responseText = outcome.responseText ?? '';
      this.onload?.();
    }
  }
  return { Xhr: FakeXhr as unknown as typeof XMLHttpRequest, sent };
}

const input = (over: Partial<SubmissionInput> = {}): SubmissionInput => ({
  method: 'UPLOAD',
  file: new File(['xyz'], 'tap-1.mp4', { type: 'video/mp4' }),
  url: '',
  disclosure: { aiGeneratedParts: ['video'], noRealPersonLikeness: true, noCopyrightedMaterial: true },
  proposedLabelType: 'AI_GENERATED',
  note: '',
  ...over,
});
const signed = {
  status: 200,
  responseText: JSON.stringify({ uploadUrl: 'https://r2.example/put', headers: { 'Content-Type': 'video/mp4' }, uploadToken: 't.k' }),
};

describe('submitFilm', () => {
  it('uploads a file straight to the bucket with progress, then completes it with the AI Disclosure', async () => {
    const { Xhr, sent } = fakeXhr([signed, { status: 200 }, { status: 201, responseText: '{}' }], [[25, 100], [100, 100]]);
    const percents: number[] = [];

    const result = await submitFilm('ep/1', input({ note: ' Bản 2 ' }), (percent) => percents.push(percent), Xhr);

    expect(result).toEqual({ ok: true });
    expect(sent.map((r) => [r.method, r.url])).toEqual([
      ['POST', '/api/episodes/ep%2F1/media/uploads'],
      ['PUT', 'https://r2.example/put'],
      ['POST', '/api/episodes/ep%2F1/media/uploads/complete'],
    ]);
    expect(JSON.parse(String(sent[0].body))).toEqual({ fileName: 'tap-1.mp4', sizeBytes: 3 });
    expect(sent[1].headers).toEqual({ 'Content-Type': 'video/mp4' });
    expect(sent[1].body).toBeInstanceOf(File);
    expect(JSON.parse(String(sent[2].body))).toEqual({
      uploadToken: 't.k',
      aiDisclosure: input().disclosure,
      proposedLabelType: 'AI_GENERATED',
      submissionNote: 'Bản 2',
    });
    // Only the PUT reports progress: the two JSON calls are tiny.
    expect(percents).toEqual([25, 100]);
  });

  it('falls back to the multipart route when the storage cannot take direct uploads', async () => {
    const { Xhr, sent } = fakeXhr([{ status: 501, responseText: '{}' }, { status: 201, responseText: '{}' }]);
    expect(await submitFilm('e1', input(), undefined, Xhr)).toEqual({ ok: true });
    expect(sent[1]).toMatchObject({ method: 'POST', url: '/api/episodes/e1/media' });
    expect(sent[1].body).toBeInstanceOf(FormData);
  });

  it('says so when the film could not reach the bucket', async () => {
    const { Xhr, sent } = fakeXhr([signed, { status: 403 }]);
    expect(await submitFilm('e1', input(), undefined, Xhr)).toEqual({
      ok: false,
      status: 403,
      error: 'Không tải được phim lên kho lưu trữ. Kiểm tra mạng rồi thử lại.',
    });
    expect(sent).toHaveLength(2);
  });

  it('posts a link as JSON', async () => {
    const { Xhr, sent } = fakeXhr([{ status: 201 }]);
    await submitFilm('e1', input({ method: 'REMOTE_FILE', file: null, url: 'https://cdn/a.mp4' }), undefined, Xhr);
    expect(sent[0].headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(String(sent[0].body))).toMatchObject({ sourceMethod: 'REMOTE_FILE', sourceUrl: 'https://cdn/a.mp4' });
  });

  it('shows the API refusal with its details', async () => {
    const body = { error: { code: 'CONFLICT', message: 'The contract of this project is not signed by both sides yet', details: ['episode 1'] } };
    const { Xhr } = fakeXhr([{ status: 409, responseText: JSON.stringify(body) }]);
    expect(await submitFilm('e1', input(), undefined, Xhr)).toEqual({
      ok: false,
      status: 409,
      error: 'Hợp đồng của dự án chưa được hai bên ký.',
    });
  });

  it('keeps a readable error when the answer is not JSON', async () => {
    const { Xhr } = fakeXhr([{ status: 502, responseText: '<html>Bad gateway</html>' }]);
    expect(await submitFilm('e1', input(), undefined, Xhr)).toEqual({
      ok: false,
      status: 502,
      error: 'Lỗi máy chủ (502).',
    });
  });

  it('reports a lost connection', async () => {
    const { Xhr } = fakeXhr(['network-error']);
    const result = await submitFilm('e1', input(), undefined, Xhr);
    expect(result).toEqual({ ok: false, status: 0, error: 'Không kết nối được tới Studio Web' });
  });
});
