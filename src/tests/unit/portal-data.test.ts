import { describe, expect, it, vi } from 'vitest';

const api = {
  me: vi.fn(async () => ({ name: 'Lumen Studio' })),
  contracts: vi.fn(async () => []),
  projects: vi.fn(async () => []),
  notifications: vi.fn(async () => ({ data: [] })),
};
vi.mock('@/lib/session/server', () => ({ pagePortal: async () => api }));

import { loadContracts, loadNotifications, loadProjects, loadStudio } from '@/lib/session/portal-data';

describe('portal data loaders', () => {
  it('read the studio, its contracts, projects and latest 20 notifications', async () => {
    await expect(loadStudio()).resolves.toEqual({ name: 'Lumen Studio' });
    await loadContracts();
    await loadProjects();
    await loadNotifications();
    expect(api.contracts).toHaveBeenCalled();
    expect(api.projects).toHaveBeenCalled();
    expect(api.notifications).toHaveBeenCalledWith(20);
  });
});
