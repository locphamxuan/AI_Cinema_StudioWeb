// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessForm } from '@/components/AccessForm';
import { BriefList } from '@/components/BriefList';
import { FilmLibrary } from '@/components/FilmLibrary';
import { ReplyPanel, type DeliveryView } from '@/components/ReplyPanel';
import { loadCatalog } from '@/lib/demo/catalog';
import { parseBrief } from '@/lib/mail/brief-parser';
import { FIXTURE_MESSAGES } from '@/lib/mail/fixtures';

const refresh = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

const deliveries: DeliveryView[] = [
  { version: 'v1', label: 'Bản giao đầu', summary: 'Dựng thô.', episodes: [{ title: 'Tập đầu', durationSeconds: 125 }], timesSent: 0 },
  { version: 'v2', label: 'Bản sửa theo góp ý', summary: 'Đã chỉnh màu.', episodes: [{ title: 'Tập đầu (sửa)', durationSeconds: 130 }], timesSent: 2 },
];

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('BriefList', () => {
  const rows = FIXTURE_MESSAGES.map((message) => ({ brief: parseBrief(message)!, sent: [] as never[] }));

  it('shows each order with what it asks and whether the film went back', () => {
    render(<BriefList rows={[rows[0], { ...rows[1], sent: [{ version: 'v1' } as never] }]} />);

    expect(screen.getByRole('link', { name: /Căn Hộ Số 13/ })).toHaveAttribute('href', '/messages/1001');
    expect(screen.getByText('Chưa trả phim')).toBeInTheDocument();
    expect(screen.getByText('Đã gửi v1')).toBeInTheDocument();
    expect(screen.getAllByText(/Từ AI Cinema/)).toHaveLength(2);
  });

  it('explains an empty inbox', () => {
    render(<BriefList rows={[]} />);
    expect(screen.getByText(/Chưa có đơn đặt hàng nào/)).toBeInTheDocument();
  });
});

describe('ReplyPanel', () => {
  const panel = (generic = false) => (
    <ReplyPanel messageId="1001" contactName="Nguyễn Thị Creator" contactEmail="creator01@aicinema.com" deliveries={deliveries} generic={generic} />
  );

  it('offers the versions, shows the episodes of the chosen one and how often it went out', async () => {
    render(panel());
    expect(screen.getByRole('radio', { name: /Bản giao đầu \(v1\)/ })).toBeChecked();
    expect(screen.getByText('Tập 1 — Tập đầu')).toBeInTheDocument();
    expect(screen.getByText('2:05')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: /Bản sửa theo góp ý \(v2\)/ }));
    expect(screen.getByText('Tập 1 — Tập đầu (sửa)')).toBeInTheDocument();
    expect(screen.getByText(/đã gửi 2 lần/)).toBeInTheDocument();
  });

  it('warns that the films are the general ones when none were made for the title', () => {
    render(panel(true));
    expect(screen.getByText(/Chưa có phim soạn sẵn riêng/)).toBeInTheDocument();
  });

  it('sends the chosen version and reports where it went', async () => {
    const fetchMock = stubFetch(201, { id: 'r1' });
    render(panel());
    await userEvent.click(screen.getByRole('radio', { name: /v2/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Gửi lại phim' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/messages/1001/reply', expect.objectContaining({ method: 'POST', body: JSON.stringify({ version: 'v2' }) }));
    expect(await screen.findByRole('status')).toHaveTextContent('Đã gửi phim v2 tới creator01@aicinema.com');
    expect(refresh).toHaveBeenCalled();
  });

  it('shows the reason when sending fails', async () => {
    stubFetch(502, { error: 'Không gửi được email tới creator01@aicinema.com: SMTP refused' });
    render(panel());
    await userEvent.click(screen.getByRole('button', { name: 'Gửi lại phim' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('SMTP refused');
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('FilmLibrary', () => {
  it('lists every prepared project with its versions and the general films', async () => {
    render(<FilmLibrary catalog={await loadCatalog()} />);

    const project = screen.getByRole('region', { name: 'Căn Hộ Số 13' });
    expect(within(project).getByText('Bản giao đầu (v1)')).toBeInTheDocument();
    expect(within(project).getByText('Bản sửa theo góp ý (v2)')).toBeInTheDocument();
    expect(screen.getByText(/dùng cho dự án chưa có phim riêng/)).toBeInTheDocument();
  });
});

describe('AccessForm', () => {
  it('sends the code and refreshes when it is right', async () => {
    stubFetch(200, { ok: true });
    render(<AccessForm />);
    await userEvent.type(screen.getByLabelText('Mã truy cập'), 's3cret');
    await userEvent.click(screen.getByRole('button', { name: 'Vào hộp thư' }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('shows why the code was refused', async () => {
    stubFetch(401, { error: 'Mã truy cập không đúng.' });
    render(<AccessForm />);
    await userEvent.type(screen.getByLabelText('Mã truy cập'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Vào hộp thư' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Mã truy cập không đúng.');
    expect(refresh).not.toHaveBeenCalled();
  });
});
