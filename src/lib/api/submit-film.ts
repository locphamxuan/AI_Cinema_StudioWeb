import { ApiError, describeError } from './http';
import { buildLinkBody, buildUploadForm, type SubmissionInput } from '@/lib/domain/submission';

export type SubmitResult = { ok: true } | { ok: false; error: string; status: number };

function errorOf(status: number, text: string): string {
  let body: { error?: { code?: string; message?: string; details?: unknown } } | null = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  const details = body?.error?.details;
  return describeError(
    new ApiError(
      status,
      body?.error?.code ?? `HTTP_${status}`,
      body?.error?.message ?? (status ? 'Request failed' : 'Không kết nối được tới Studio Web'),
      Array.isArray(details) ? details.map(String) : [],
    ),
  );
}

/**
 * Sends a film to this site's route handler, which adds the studio's token and forwards it to AI Cinema.
 * XMLHttpRequest (not fetch) because it reports upload progress for large films.
 */
export function submitFilm(
  episodeId: string,
  input: SubmissionInput,
  onProgress?: (percent: number) => void,
  Xhr: typeof XMLHttpRequest = XMLHttpRequest,
): Promise<SubmitResult> {
  return new Promise((resolve) => {
    const xhr = new Xhr();
    xhr.open('POST', `/api/episodes/${encodeURIComponent(episodeId)}/media`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () =>
      resolve(xhr.status >= 200 && xhr.status < 300 ? { ok: true } : { ok: false, status: xhr.status, error: errorOf(xhr.status, xhr.responseText) });
    xhr.onerror = () => resolve({ ok: false, status: 0, error: errorOf(0, '') });
    if (input.method === 'UPLOAD') {
      xhr.send(buildUploadForm(input));
    } else {
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(buildLinkBody(input)));
    }
  });
}
