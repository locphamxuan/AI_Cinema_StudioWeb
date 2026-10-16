/** A video stored on the site, as POST /api/films answers. */
export interface UploadedFilm {
  id: string;
  fileName: string;
  sizeBytes: number;
}

/**
 * Sends one file as the raw request body, so the server streams it to disk. XMLHttpRequest rather than fetch:
 * only it reports upload progress, which a video of a few GB needs.
 */
export function uploadFilm(file: File, onProgress: (percent: number) => void): Promise<UploadedFilm> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/films');
    xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      const body = (() => {
        try {
          return JSON.parse(xhr.responseText) as UploadedFilm & { error?: string };
        } catch {
          return null;
        }
      })();
      if (xhr.status === 201 && body) resolve(body);
      else reject(new Error(body?.error ?? `Tải lên lỗi (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Mất kết nối khi tải lên.'));
    xhr.send(file);
  });
}
