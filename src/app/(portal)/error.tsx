'use client';

import { BUTTON, ErrorCard } from '@/components/ui';

/** A page that failed outside the guarded data load (e.g. a render error): say so and offer to try again. */
export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4">
      <ErrorCard message="Không hiển thị được trang này. Thử tải lại; nếu vẫn lỗi, hãy đăng xuất rồi đăng nhập lại." />
      <button type="button" onClick={reset} className={BUTTON}>
        Tải lại trang
      </button>
    </div>
  );
}
