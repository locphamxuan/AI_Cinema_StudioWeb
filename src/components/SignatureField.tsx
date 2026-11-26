'use client';

import { useEffect, useState } from 'react';
import { checkSignatureContent, checkSignatureImage, checkSignatureSize } from '@/lib/domain/contract';
import { formatBytes } from '@/lib/format';
import { INPUT } from './ui';

/** Reads the pixel size of a chosen image in the browser. */
function imageSize(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/**
 * The studio's signature image: chosen, checked (type, 2 MB, size in pixels) and previewed on a signature line,
 * so the signer sees what the system will draw into the Bên B block before confirming.
 */
export function SignatureField({ onChange }: { onChange: (file: File | null, problem: string | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function choose(chosen: File | null) {
    setFile(chosen);
    setPreview(null);
    if (!chosen) return onChange(null, null);
    const check = checkSignatureImage(chosen);
    if (!check.ok) return onChange(null, check.message);
    const mismatch = checkSignatureContent(chosen.name, new Uint8Array(await chosen.slice(0, 4).arrayBuffer()));
    if (mismatch) return onChange(null, mismatch);
    const url = URL.createObjectURL(chosen);
    const size = await imageSize(url);
    const problem = size ? checkSignatureSize(size.width, size.height) : 'Không đọc được ảnh chữ ký, hãy chọn ảnh khác.';
    if (problem) {
      URL.revokeObjectURL(url);
      return onChange(null, problem);
    }
    setPreview(url);
    onChange(chosen, null);
  }

  return (
    <div className="space-y-2">
      <label className="block space-y-1.5 text-sm">
        <span className="block text-xs font-semibold text-muted">Ảnh chữ ký của Studio (PNG hoặc JPG, tối đa 2 MB)</span>
        <input
          name="file"
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          required
          onChange={(event) => void choose(event.target.files?.[0] ?? null)}
          className={`${INPUT} file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary-foreground`}
        />
        <span className="block text-xs text-muted">
          Ảnh chữ ký (và con dấu nếu có) trên nền trắng, cắt sát. Ảnh được đặt vào ô Bên B của hợp đồng kèm họ tên, chức vụ và ngày ký.
        </span>
      </label>
      {preview && file && (
        <figure className="rounded-lg border border-dashed border-border bg-white p-3 text-slate-900 dark:bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen file */}
          <img src={preview} alt="Xem trước chữ ký của Studio" className="mx-auto h-20 max-w-full object-contain" />
          <figcaption className="mt-2 border-t border-slate-300 pt-1 text-center text-xs text-slate-600">
            Xem trước: {file.name} ({formatBytes(file.size)})
          </figcaption>
        </figure>
      )}
    </div>
  );
}
