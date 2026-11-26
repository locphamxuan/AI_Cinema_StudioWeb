import { describe, expect, it, vi } from 'vitest';

const api = {
  me: vi.fn(async () => ({ name: 'Lumen Studio' })),
  contracts: vi.fn(async () => []),
  projects: vi.fn(async () => []),
  notifications: vi.fn(async () => ({ data: [] })),
  unreadCount: vi.fn(async () => ({ unread: 3 })),
};
vi.mock('@/lib/session/server', () => ({ pagePortal: async () => api }));

import { loadContracts, loadNotifications, loadProjects, loadStudio, loadUnreadCount } from '@/lib/session/portal-data';

describe('portal data loaders', () => {
  it('read the studio, its contracts, projects, a page of 10 notifications and the unread count', async () => {
    await expect(loadStudio()).resolves.toEqual({ name: 'Lumen Studio' });
    await loadContracts();
    await loadProjects();
    await loadNotifications(2);
    await expect(loadUnreadCount()).resolves.toEqual({ unread: 3 });
    expect(api.contracts).toHaveBeenCalled();
    expect(api.projects).toHaveBeenCalled();
    expect(api.notifications).toHaveBeenCalledWith(10, 2);
  });
});
