'use server';

import { revalidatePath } from 'next/cache';
import { describeError } from '@/lib/api/http';
import { withPortal } from '@/lib/session/server';

export interface RetryDeliveryState {
  error?: string;
  done?: string;
}

/** Processes a failed delivery again; the API accepts it for the latest version of the episode only. */
export async function retryDelivery(_previous: RetryDeliveryState, form: FormData): Promise<RetryDeliveryState> {
  const mediaAssetId = String(form.get('mediaAssetId') ?? '');
  if (!mediaAssetId) return { error: 'Yêu cầu không hợp lệ.' };
  try {
    await withPortal((api) => api.retryDelivery(mediaAssetId));
  } catch (error) {
    return { error: describeError(error) };
  }
  revalidatePath('/', 'layout');
  return { done: 'Đã gửi bản phim đi xử lý lại. Trạng thái sẽ cập nhật trên trang này.' };
}
