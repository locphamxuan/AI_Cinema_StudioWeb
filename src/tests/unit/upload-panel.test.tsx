// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadReplyPanel } from '@/components/UploadReplyPanel';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock('@/components/upload-film', () => ({
  uploadFilm: vi.fn(async (file: File, onProgress: (percent: number) => void) => {
    onProgress(50);
    return { id: `film-${file.name}`, fileName: file.name, sizeBytes: file.size };
  }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const panel = (partNames: string[]) =>
  render(
    <UploadReplyPanel
      messageId="1001"
      contact={{ name: 'Creator Một', email: 'creator01@aicinema.com' }}
      subjectPrefix='[Studio] Giao phim "Mưa Sài Gòn" (Mùa 1)'
      partNames={partNames}
    />,
  );

describe('UploadReplyPanel', () => {
  it('shows a slot per ordered episode and the mail it will send', () => {
    panel(['Phần 1 (trọn bộ)']);
    expect(screen.getByText('Phần 1 (trọn bộ)')).toBeInTheDocument();
    expect(screen.getByLabelText('Người nhận')).toHaveTextContent('creator01@aicinema.com');
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('[Studio] Giao phim "Mưa Sài Gòn" (Mùa 1) - Bản giao đầu v1');
    expect(screen.getByRole('button', { name: /video cho Creator/ })).toBeDisabled();
  });

  it('uploads the picked video and mails it with its episode', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ aiCinema: { status: 'notified' } }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    panel(['Tập 1', 'Tập 2']);

    const video = new File([new Uint8Array(16)], 'tap-2.mp4', { type: 'video/mp4' });
    await userEvent.upload(screen.getByLabelText('Chọn video Tập 2'), video);
    expect(await screen.findByText('tap-2.mp4')).toBeInTheDocument();
    expect(screen.getByLabelText('Số tập trong thư')).toHaveTextContent('1/2 tập (các tập còn lại gửi ở thư sau)');

    await userEvent.click(screen.getByRole('button', { name: /Gửi 1 video cho Creator/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/messages/1001/reply');
    expect(JSON.parse(String(init.body))).toMatchObject({
      source: 'upload',
      version: 'v1',
      episodes: [{ episode: 2, filmId: 'film-tap-2.mp4' }],
      compose: { subject: '[Studio] Giao phim "Mưa Sài Gòn" (Mùa 1) - Bản giao đầu v1' },
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Đã gửi 1 video (v1) tới creator01@aicinema.com.');
    expect(refresh).toHaveBeenCalled();
  });
});
