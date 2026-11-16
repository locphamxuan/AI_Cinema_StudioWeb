'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { withPortal } from '@/lib/session/server';

export async function markAllNotificationsRead(): Promise<void> {
  // An expired session goes to the login page; any other failure leaves the list as it is.
  await withPortal((api) => api.markAllRead()).catch((error: unknown) => unstable_rethrow(error));
  revalidatePath('/');
}
