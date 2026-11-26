'use client';

import { BUTTON, ErrorCard } from '@/components/ui';

/** A page that failed outside the guarded data load (e.g. a render error): say so and offer to try again. */
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4">
      <ErrorCard message="Không hiển thị được trang này. Thử tải lại; nếu vẫn lỗi, hãy đăng xuất rồi đăng nhập lại." />
      {error.digest && (
        <p className="text-xs text-muted">
          Mã lỗi (gửi cho AI Cinema khi báo lỗi): <code translate="no">{error.digest}</code>
        </p>
      )}
      <button type="button" onClick={reset} className={BUTTON}>
        Tải lại trang
      </button>
    </div>
  );
}
