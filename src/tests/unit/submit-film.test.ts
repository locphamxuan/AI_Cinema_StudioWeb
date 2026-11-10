import { describe, expect, it } from 'vitest';
import { submitFilm } from '@/lib/api/submit-film';
import type { SubmissionInput } from '@/lib/domain/submission';

type Outcome = { status: number; responseText?: string } | 'network-error';

/** A stand-in for XMLHttpRequest that answers each send with the given outcome. */
function fakeXhr(outcome: Outcome, progress: [number, number][] = []) {
  const sent: { method?: string; url?: string; headers: Record<string, string>; body?: unknown } = { headers: {} };
  class FakeXhr {
    status = 0;
    responseText = '';
    upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
      onprogress: null,
    };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    open(method: string, url: string) {
      sent.method = method;
      sent.url = url;
    }
    setRequestHeader(name: string, value: string) {
      sent.headers[name] = value;
    }
    send(body: unknown) {
      sent.body = body;
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
  file: new File(['x'], 'tap-1.mp4', { type: 'video/mp4' }),
  url: '',
  disclosure: { aiGeneratedParts: ['video'], noRealPersonLikeness: true, noCopyrightedMaterial: true },
  proposedLabelType: 'AI_GENERATED',
  note: '',
  ...over,
});

describe('submitFilm', () => {
  it('posts a file as multipart to the route handler and reports the upload progress', async () => {
    const { Xhr, sent } = fakeXhr({ status: 201, responseText: '{}' }, [[25, 100], [100, 100]]);
    const percents: number[] = [];
    const result = await submitFilm('ep/1', input(), (percent) => percents.push(percent), Xhr);
    expect(result).toEqual({ ok: true });
    expect(sent.method).toBe('POST');
    expect(sent.url).toBe('/api/episodes/ep%2F1/media');
    expect(sent.body).toBeInstanceOf(FormData);
    expect(sent.headers).toEqual({});
    expect(percents).toEqual([25, 100]);
  });

  it('posts a link as JSON', async () => {
    const { Xhr, sent } = fakeXhr({ status: 201 });
    await submitFilm('e1', input({ method: 'REMOTE_FILE', file: null, url: 'https://cdn/a.mp4' }), undefined, Xhr);
    expect(sent.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(String(sent.body))).toMatchObject({ sourceMethod: 'REMOTE_FILE', sourceUrl: 'https://cdn/a.mp4' });
  });

  it('shows the API refusal with its details', async () => {
    const body = { error: { code: 'CONFLICT', message: 'The contract of this project is not signed yet', details: ['episode 1'] } };
    const { Xhr } = fakeXhr({ status: 409, responseText: JSON.stringify(body) });
    expect(await submitFilm('e1', input(), undefined, Xhr)).toEqual({
      ok: false,
      status: 409,
      error: 'Không thể thực hiện ở trạng thái hiện tại: The contract of this project is not signed yet; episode 1',
    });
  });

  it('keeps a readable error when the answer is not JSON', async () => {
    const { Xhr } = fakeXhr({ status: 502, responseText: '<html>Bad gateway</html>' });
    expect(await submitFilm('e1', input(), undefined, Xhr)).toEqual({
      ok: false,
      status: 502,
      error: 'Lỗi máy chủ (502): Request failed',
    });
  });

  it('reports a lost connection', async () => {
    const { Xhr } = fakeXhr('network-error');
    const result = await submitFilm('e1', input(), undefined, Xhr);
    expect(result).toEqual({ ok: false, status: 0, error: 'Không kết nối được tới Studio Web' });
  });
});
