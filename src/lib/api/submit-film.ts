import { apiErrorOf, describeError } from './http';
import { buildLinkBody, buildUploadForm, type SubmissionInput } from '@/lib/domain/submission';

export type SubmitResult = { ok: true } | { ok: false; error: string; status: number };

interface DirectUpload {
  uploadUrl: string;
  headers: Record<string, string>;
  uploadToken: string;
}

function errorOf(status: number, text: string): string {
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return describeError(apiErrorOf(status, body, status ? 'Request failed' : 'Không kết nối được tới Studio Web'));
}

const episodePath = (episodeId: string, rest = '') => `/api/episodes/${encodeURIComponent(episodeId)}/media${rest}`;

/** One XMLHttpRequest (not fetch: it reports upload progress for large films), answered as a SubmitResult with its text. */
function send(
  Xhr: typeof XMLHttpRequest,
  request: { method: string; url: string; body: XMLHttpRequestBodyInit; headers?: Record<string, string> },
  onProgress?: (percent: number) => void,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve) => {
    const xhr = new Xhr();
    xhr.open(request.method, request.url);
    for (const [name, value] of Object.entries(request.headers ?? {})) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => resolve({ status: 0, text: '' });
    xhr.send(request.body);
  });
}

const ok = (status: number) => status >= 200 && status < 300;
const result = ({ status, text }: { status: number; text: string }): SubmitResult =>
  ok(status) ? { ok: true } : { ok: false, status, error: errorOf(status, text) };
const json = (body: unknown) => ({ body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

/**
 * Sends the film of an episode to the Reviewer. A file goes straight to the bucket (the API signs a PUT URL, then
 * checks the stored film), so gigabytes never pass through Studio Web; a storage that cannot sign falls back to
 * the multipart route. A link is a small JSON request. Every request carries the studio's token server side.
 */
export async function submitFilm(
  episodeId: string,
  input: SubmissionInput,
  onProgress?: (percent: number) => void,
  Xhr: typeof XMLHttpRequest = XMLHttpRequest,
): Promise<SubmitResult> {
  if (input.method !== 'UPLOAD' || !input.file) {
    return result(await send(Xhr, { method: 'POST', url: episodePath(episodeId), ...json(buildLinkBody(input)) }));
  }
  const file = input.file;
  const started = await send(Xhr, {
    method: 'POST',
    url: episodePath(episodeId, '/uploads'),
    ...json({ fileName: file.name, sizeBytes: file.size }),
  });
  if (started.status === 501) {
    return result(await send(Xhr, { method: 'POST', url: episodePath(episodeId), body: buildUploadForm(input) }, onProgress));
  }
  if (!ok(started.status)) return result(started);

  let upload: DirectUpload;
  try {
    upload = JSON.parse(started.text) as DirectUpload;
  } catch {
    return { ok: false, status: started.status, error: 'Không bắt đầu tải phim lên được. Vui lòng thử lại.' };
  }
  const put = await send(Xhr, { method: 'PUT', url: upload.uploadUrl, body: file, headers: upload.headers }, onProgress);
  if (!ok(put.status)) {
    return { ok: false, status: put.status, error: 'Không tải được phim lên máy chủ. Kiểm tra mạng rồi thử lại.' };
  }
  const { aiDisclosure, proposedLabelType, submissionNote } = buildLinkBody(input);
  const metadata = { aiDisclosure, proposedLabelType, ...(submissionNote ? { submissionNote } : {}) };
  return result(
    await send(Xhr, {
      method: 'POST',
      url: episodePath(episodeId, '/uploads/complete'),
      ...json({ uploadToken: upload.uploadToken, ...metadata }),
    }),
  );
}
