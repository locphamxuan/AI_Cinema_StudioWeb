// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionWatcher } from '@/components/SessionWatcher';

const router = { refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const setAccount = (id: string | null) => {
  document.cookie = id ? `sw_account=${id}; path=/` : 'sw_account=; path=/; max-age=0';
};
const focusWindow = () => act(() => void window.dispatchEvent(new Event('focus')));

beforeEach(() => {
  router.refresh.mockReset();
  router.replace.mockReset();
  setAccount('studio-a');
});
afterEach(() => setAccount(null));

describe('SessionWatcher', () => {
  it('stays quiet while the window keeps its account', () => {
    render(<SessionWatcher accountId="studio-a" cookieName="sw_account" />);
    focusWindow();
    expect(router.refresh).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('reloads for the account another window signed in, and says so', () => {
    render(<SessionWatcher accountId="studio-a" cookieName="sw_account" />);
    setAccount('studio-b');
    focusWindow();
    expect(router.refresh).toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('tài khoản Studio khác');
  });

  it('goes to the login page when another window signed out', () => {
    render(<SessionWatcher accountId="studio-a" cookieName="sw_account" />);
    setAccount(null);
    focusWindow();
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});
