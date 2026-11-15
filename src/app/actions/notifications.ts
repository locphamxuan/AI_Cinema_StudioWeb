'use server';

import { revalidatePath } from 'next/cache';
import { withPortal } from '@/lib/session/server';

export async function markAllNotificationsRead(): Promise<void> {
  await withPortal((api) => api.markAllRead()).catch(() => undefined);
  revalidatePath('/');
}
