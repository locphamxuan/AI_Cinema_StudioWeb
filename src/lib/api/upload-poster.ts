import { apiErrorOf, describeError } from './http';
import type { StudioPoster } from './types';

/** Same rule as the API: a raster image a browser shows, at most 20 MB. */
export const POSTER_MAX_BYTES = 20 * 1024 * 1024;
export const POSTER_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif';
const POSTER_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif'];

export type PosterUploadResult = { ok: true; studioPoster: StudioPoster | null } | { ok: false; error: string; status: number };

/** What is wrong with the chosen poster before it is sent, or null when it can go. */
export function posterProblem(file: File | null): string | null {
  if (!file) return 'Hãy chọn ảnh poster.';
  const name = file.name.toLowerCase();
  if (!POSTER_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return 'Poster phải là ảnh PNG, JPG, WebP, GIF, BMP hoặc AVIF.';
  }
  if (file.size > POSTER_MAX_BYTES) return 'Ảnh poster tối đa 20 MB.';
  if (!file.size) return 'Tệp ảnh đang trống.';
  return null;
}

/** Sends the poster through the Studio Web route, which adds the studio's token server side. */
export async function uploadPoster(projectId: string, file: File, fetchImpl: typeof fetch = fetch): Promise<PosterUploadResult> {
  const form = new FormData();
  form.append('file', file);
  let response: Response;
  try {
    response = await fetchImpl(`/api/projects/${encodeURIComponent(projectId)}/poster`, { method: 'POST', body: form });
  } catch {
    return { ok: false, status: 0, error: 'Không kết nối được tới Studio Web' };
  }
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    return { ok: false, status: response.status, error: describeError(apiErrorOf(response.status, body, 'Request failed')) };
  }
  return { ok: true, studioPoster: (body as { studioPoster?: StudioPoster | null } | null)?.studioPoster ?? null };
}
