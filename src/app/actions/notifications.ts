'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { portalPath } from '@/lib/domain/notification';
import { withPortal } from '@/lib/session/server';

export async function markAllNotificationsRead(): Promise<void> {
  // An expired session goes to the login page; any other failure leaves the list as it is.
  await withPortal((api) => api.markAllRead()).catch((error: unknown) => unstable_rethrow(error));
  revalidatePath('/', 'layout');
}

/** Opens the page a notification points to, marking it read on the way; a failed mark still opens the page. */
export async function openNotification(form: FormData): Promise<void> {
  const id = String(form.get('notificationId') ?? '');
  const target = portalPath(String(form.get('link') ?? '')) ?? '/';
  if (id) await withPortal((api) => api.markRead(id)).catch((error: unknown) => unstable_rethrow(error));
  revalidatePath('/', 'layout');
  redirect(target);
}
