'use client';

import { useActionState } from 'react';
import { RotateCw } from 'lucide-react';
import { retryDelivery, type RetryDeliveryState } from '@/app/actions/deliveries';
import { BUTTON_GHOST, ErrorCard, SuccessCard } from './ui';

/** Asks AI Cinema to process a failed delivery again, without sending the film once more. */
export function RetryDeliveryButton({ mediaAssetId }: { mediaAssetId: string }) {
  const [state, formAction, pending] = useActionState<RetryDeliveryState, FormData>(retryDelivery, {});
  if (state.done) return <SuccessCard message={state.done} />;
  return (
    <form action={formAction} className="mt-2 space-y-2">
      <input type="hidden" name="mediaAssetId" value={mediaAssetId} />
      {state.error && <ErrorCard message={state.error} />}
      <button type="submit" disabled={pending} className={BUTTON_GHOST}>
        <RotateCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} aria-hidden="true" />
        {pending ? 'Đang gửi xử lý lại…' : 'Xử lý lại'}
      </button>
    </form>
  );
}
