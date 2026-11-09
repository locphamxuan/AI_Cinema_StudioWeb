// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const router = { push: vi.fn(), refresh: vi.fn() };
let pathname = '/';
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => pathname,
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error;
  },
}));
vi.mock('@/app/actions/auth', () => ({ login: vi.fn(async () => ({})), logout: vi.fn() }));
const submitFilm = vi.fn();
vi.mock('@/lib/api/submit-film', () => ({ submitFilm: (...args: unknown[]) => submitFilm(...args) }));

import { LoginForm } from '@/components/LoginForm';
import { PortalHeader } from '@/components/PortalHeader';
import { SubmitFilmForm } from '@/components/SubmitFilmForm';
import { Guarded } from '@/components/ui';
import { ApiError } from '@/lib/api/http';

beforeEach(() => {
  router.push.mockClear();
  router.refresh.mockClear();
  submitFilm.mockReset();
});

describe('LoginForm', () => {
  it('shows why the studio has to log in again', () => {
    render(<LoginForm notice="Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Phiên đăng nhập đã hết hạn');
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
  });
});

describe('PortalHeader', () => {
  it('marks the section of the current page', () => {
    pathname = '/projects/p1/episodes/e1';
    render(<PortalHeader studioName="Lumen Studio" />);
    expect(screen.getByText('Lumen Studio')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dự án/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Tổng quan/ })).not.toHaveAttribute('aria-current');
  });

  it('marks the overview only on its own page', () => {
    pathname = '/';
    render(<PortalHeader studioName="Lumen Studio" />);
    expect(screen.getByRole('link', { name: /Tổng quan/ })).toHaveAttribute('aria-current', 'page');
  });
});

async function fillDisclosure() {
  await userEvent.click(screen.getByLabelText('Hình ảnh động / video'));
  await userEvent.click(screen.getByLabelText(/không dùng hình ảnh, giọng nói/));
  await userEvent.click(screen.getByLabelText(/không dùng tư liệu có bản quyền/));
  await userEvent.selectOptions(screen.getByRole('combobox'), 'AI_GENERATED');
}

describe('SubmitFilmForm', () => {
  it('lists every missing part before sending', async () => {
    render(<SubmitFilmForm projectId="p1" episodeId="e1" />);
    await userEvent.click(screen.getByRole('button', { name: /Nộp phim cho Reviewer/ }));
    expect(screen.getAllByRole('alert')).toHaveLength(5);
    expect(submitFilm).not.toHaveBeenCalled();
  });

  it('delivers a link with the AI Disclosure and offers the way back to the project', async () => {
    submitFilm.mockResolvedValue({ ok: true });
    render(<SubmitFilmForm projectId="p1" episodeId="e1" />);
    await userEvent.click(screen.getByLabelText(/Link HLS/));
    await userEvent.type(screen.getByLabelText('Đường dẫn phim'), 'https://cdn.studio.vn/tap-1/master.m3u8');
    await fillDisclosure();
    await userEvent.click(screen.getByRole('button', { name: /Nộp phim cho Reviewer/ }));
    expect(submitFilm).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({
        method: 'HLS_URL',
        url: 'https://cdn.studio.vn/tap-1/master.m3u8',
        proposedLabelType: 'AI_GENERATED',
        disclosure: { aiGeneratedParts: ['video'], noRealPersonLikeness: true, noCopyrightedMaterial: true },
      }),
      expect.any(Function),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Đã nộp phim cho Reviewer');
    expect(screen.getByRole('link', { name: 'Về trang dự án' })).toHaveAttribute('href', '/projects/p1');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('sends the studio to the login page when its session ended', async () => {
    submitFilm.mockResolvedValue({ ok: false, status: 401, error: 'Phiên đăng nhập đã hết hạn' });
    render(<SubmitFilmForm projectId="p1" episodeId="e1" />);
    await userEvent.click(screen.getByLabelText(/Link tệp video/));
    await userEvent.type(screen.getByLabelText('Đường dẫn phim'), 'https://cdn.studio.vn/tap-1.mp4');
    await fillDisclosure();
    await userEvent.click(screen.getByRole('button', { name: /Nộp phim cho Reviewer/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Phiên đăng nhập đã hết hạn');
    expect(router.push).toHaveBeenCalledWith('/login?expired=1');
  });
});

describe('Guarded', () => {
  it('shows the loaded content', async () => {
    render(await Guarded({ load: async () => <p>Nội dung</p> }));
    expect(screen.getByText('Nội dung')).toBeInTheDocument();
  });

  it('shows an API error instead of crashing the page', async () => {
    render(await Guarded({ load: async () => Promise.reject(new ApiError(404, 'NOT_FOUND', 'Project not found')) }));
    expect(screen.getByRole('alert')).toHaveTextContent('Không tìm thấy dữ liệu: Project not found');
  });

  it('lets a redirect through', async () => {
    await expect(Guarded({ load: async () => Promise.reject(new Error('NEXT_REDIRECT;/login')) })).rejects.toThrow('NEXT_REDIRECT');
  });
});
