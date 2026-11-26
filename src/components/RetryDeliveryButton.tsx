'use client';

import { useActionState, useCallback, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { retryDelivery, type RetryDeliveryState } from '@/app/actions/deliveries';
import { ConfirmDialog } from './ConfirmDialog';
import { BUTTON_GHOST, ErrorCard, SuccessCard } from './ui';

/** Asks AI Cinema to process a failed delivery again, without sending the film once more. */
export function RetryDeliveryButton({ mediaAssetId, version }: { mediaAssetId: string; version: number }) {
  const [state, formAction, pending] = useActionState<RetryDeliveryState, FormData>(retryDelivery, {});
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const closeConfirm = useCallback(() => setConfirming(false), []);
  if (state.done) return <SuccessCard message={state.done} />;
  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(event) => {
        // Only the dialog's confirm button sends; nothing else may submit, and never twice while pending.
        if (!confirmedRef.current || pending) event.preventDefault();
        confirmedRef.current = false;
      }}
      className="mt-2 space-y-2"
    >
      <input type="hidden" name="mediaAssetId" value={mediaAssetId} />
      {state.error && <ErrorCard message={state.error} />}
      <button type="button" onClick={() => setConfirming(true)} disabled={pending} className={BUTTON_GHOST}>
        <RotateCw className={`h-4 w-4 ${pending ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
        {pending ? 'Đang gửi xử lý lại…' : 'Xử lý lại'}
      </button>
      <ConfirmDialog
        open={confirming}
        title={`Xử lý lại bản ${version}?`}
        confirmLabel="Xử lý lại"
        onCancel={closeConfirm}
        onConfirm={() => {
          setConfirming(false);
          confirmedRef.current = true;
          formRef.current?.requestSubmit();
        }}
      >
        <p>AI Cinema xử lý lại video từ tệp hoặc link đã nộp. Nếu lỗi do link, hãy sửa tệp ở link đó trước.</p>
        <p className="text-muted">Muốn đổi sang tệp hoặc link khác, dùng nút Nộp lại phim.</p>
      </ConfirmDialog>
    </form>
  );
}
