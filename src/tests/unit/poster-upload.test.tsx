// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const uploadPoster = vi.fn();
vi.mock('@/lib/api/upload-poster', async (original) => ({
  ...(await original<typeof import('@/lib/api/upload-poster')>()),
  uploadPoster: (...args: unknown[]) => uploadPoster(...args),
}));

import { PosterUpload } from '@/components/PosterUpload';

const PROJECT = '7f1c8a2e-5b4d-4c3a-9e2f-1a2b3c4d5e6f';

beforeEach(() => {
  router.push.mockClear();
  router.refresh.mockClear();
  uploadPoster.mockReset();
});

describe('PosterUpload', () => {
  it('asks for a poster before one is sent, and sends the chosen image', async () => {
    const studioPoster = { fileName: 'poster.png', uploadedAt: '2026-11-22T03:00:00.000Z' };
    uploadPoster.mockResolvedValue({ ok: true, studioPoster });
    render(<PosterUpload projectId={PROJECT} poster={null} />);
    expect(screen.getByRole('heading', { name: 'Poster phim' })).toBeInTheDocument();
    expect(screen.getByText(/Chưa nộp poster/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tải poster lên' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Hãy chọn ảnh poster.');
    expect(uploadPoster).not.toHaveBeenCalled();

    const file = new File(['img'], 'poster.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Ảnh poster'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Tải poster lên' }));

    expect(uploadPoster).toHaveBeenCalledWith(PROJECT, file);
    expect(await screen.findByRole('status')).toHaveTextContent('Đã nộp poster.');
    expect(screen.getByText(/Đã nộp poster lúc .*: poster\.png\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nộp lại poster' })).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
  });

  it('shows the poster already sent and the error of a failed upload', async () => {
    uploadPoster.mockResolvedValue({ ok: false, status: 401, error: 'Phiên đăng nhập đã hết hạn.' });
    render(<PosterUpload projectId={PROJECT} poster={{ fileName: 'cu.jpg', uploadedAt: '2026-11-20T03:00:00.000Z' }} />);
    expect(screen.getByText(/Đã nộp poster lúc .*: cu\.jpg\./)).toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText('Ảnh poster'), new File(['img'], 'moi.jpg', { type: 'image/jpeg' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nộp lại poster' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Phiên đăng nhập đã hết hạn.');
    expect(router.push).toHaveBeenCalled();
  });
});
