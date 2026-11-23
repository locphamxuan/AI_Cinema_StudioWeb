import { cache } from 'react';
import { pagePortal } from './server';

/**
 * The lists the portal layout (sidebar counters) and the pages both show, loaded once per request:
 * without this the overview called each endpoint twice.
 */
export const loadStudio = cache(async () => (await pagePortal()).me());
export const loadProfile = cache(async () => (await pagePortal()).profile());
export const loadContracts = cache(async () => (await pagePortal()).contracts());
export const loadProjects = cache(async () => (await pagePortal()).projects());
export const loadNotifications = cache(async (page: number) => (await pagePortal()).notifications(NOTIFICATION_PAGE_SIZE, page));
export const loadUnreadCount = cache(async () => (await pagePortal()).unreadCount());

/** Notifications per page of the overview. */
export const NOTIFICATION_PAGE_SIZE = 10;
