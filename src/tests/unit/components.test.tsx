// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Contract, LegalProfileField, PortalEpisode } from '@/lib/api/types';

const actOnContract = vi.fn(async () => ({}));
vi.mock('@/app/actions/contracts', () => ({ actOnContract: (...args: unknown[]) => actOnContract(...(args as [])) }));
const retryDelivery = vi.fn();
vi.mock('@/app/actions/deliveries', () => ({ retryDelivery: (...args: unknown[]) => retryDelivery(...args) }));

import { ContractRound } from '@/components/ContractRound';
import { EpisodeCard } from '@/components/EpisodeCard';

const contract = (over: Partial<Contract>): Contract => ({
  id: 'c1',
  projectId: 'p1',
  studioId: 's',
  round: 2,
  previousId: 'c0',
  costVnd: 150_000_000,
  budgetVnd: 200_000_000,
  proposedBy: 'ADMIN',
  status: 'ADMIN_COUNTERED',
  terms: 'Studio không chia sẻ phim cho bên thứ ba.',
  adminSignedAt: '2026-11-07T03:00:00Z',
  adminSignedBy: { id: 'a', fullName: 'Admin AI Cinema' },
  studioSignedAt: null,
  createdAt: '2026-11-07T03:00:00Z',
  updatedAt: '2026-11-07T03:00:00Z',
  ...over,
});

const episode = (over: Partial<PortalEpisode>): PortalEpisode => ({
  id: 'e1',
  episodeNumber: 1,
  title: 'Mở đầu',
  synopsis: null,
  status: 'CHANGES_REQUESTED',
  targetDurationSeconds: 120,
  deliveryDeadline: '2099-01-01T00:00:00.000Z',
  dueDate: null,
  latestDelivery: {
    id: 'm1',
    version: 1,
    ingestStatus: 'READY',
    failureReason: null,
    createdAt: '2026-11-07T03:00:00Z',
    changeRequest: { comments: 'Thay nhạc nền phút 3', createdAt: '2026-11-07T05:00:00Z' },
  },
  ...over,
});

/** jsdom decodes no image: the fake reports the size the test sets, as the browser would after loading it. */
let imageSize = { width: 600, height: 200 };
class FakeImage {
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  set src(_url: string) {
    this.naturalWidth = imageSize.width;
    this.naturalHeight = imageSize.height;
    setTimeout(() => this.onload?.());
  }
}
vi.stubGlobal('Image', FakeImage);
URL.createObjectURL = vi.fn(() => 'blob:chu-ky');
URL.revokeObjectURL = vi.fn();

const card = (over: Partial<Contract>, missingProfile: LegalProfileField[] = []) => (
  <ContractRound
    group={{ projectId: 'p1', title: 'Hành trình ánh sáng', rounds: [contract(over)] }}
    withActions
    missingProfile={missingProfile}
  />
);
const signatureInput = () => screen.getByLabelText(/Ảnh chữ ký của Studio/);
const png = (name = 'chu-ky.png') => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type: 'image/png' });

describe('ContractRound', () => {
  beforeEach(() => {
    imageSize = { width: 600, height: 200 };
  });

  it('lets the studio agree with or counter the Admin cost', async () => {
    render(card({}));
    expect(screen.getByRole('heading', { name: 'Hành trình ánh sáng' })).toBeInTheDocument();
    expect(screen.getByText('Admin đề xuất giá – chờ Studio')).toBeInTheDocument();
    expect(screen.getAllByText('150.000.000 VND').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Đồng ý giá và ký' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Đề xuất giá khác' }));
    await userEvent.type(screen.getByPlaceholderText('Ví dụ: 170.000.000'), '1500');
    expect(screen.getByText('Giá phải tròn nghìn đồng, ví dụ 170.000.000.')).toBeInTheDocument();
  });

  it('checks the signature image in the browser: type, weight and size in pixels', async () => {
    render(card({}));
    await userEvent.upload(signatureInput(), new File(['%PDF'], 'hop-dong.pdf', { type: 'application/pdf' }), {
      applyAccept: false,
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Ảnh chữ ký phải là file PNG hoặc JPG.');
    const heavy = png();
    Object.defineProperty(heavy, 'size', { value: 3 * 1024 * 1024 });
    await userEvent.upload(signatureInput(), heavy);
    expect(screen.getByRole('alert')).toHaveTextContent('Ảnh chữ ký tối đa 2 MB.');
    imageSize = { width: 100, height: 40 };
    await userEvent.upload(signatureInput(), png());
    expect(await screen.findByText(/Ảnh chữ ký quá nhỏ \(100x40 px\)/)).toBeInTheDocument();
  });

  it('previews the signature, then shows the cost and the image in a confirmation', async () => {
    vi.spyOn(HTMLFormElement.prototype, 'reportValidity').mockReturnValue(true);
    render(card({}));
    await userEvent.upload(signatureInput(), png());
    expect(await screen.findByRole('img', { name: 'Xem trước chữ ký của Studio' })).toHaveAttribute('src', 'blob:chu-ky');
    await userEvent.click(screen.getByLabelText('Tôi đã đọc điều khoản và ký hợp đồng thay mặt Studio.'));
    await userEvent.click(screen.getByRole('button', { name: 'Đồng ý giá và ký' }));
    const dialog = screen.getByRole('dialog', { name: 'Đồng ý giá Admin và ký hợp đồng?' });
    expect(dialog).toHaveTextContent('150.000.000 VND');
    expect(dialog).toHaveTextContent('chu-ky.png');
  });

  const sent = { status: 'SENT', costVnd: null, proposedBy: null, adminSignedAt: null } as const;
  async function attachSignature() {
    await userEvent.upload(signatureInput(), png());
    await screen.findByRole('img', { name: 'Xem trước chữ ký của Studio' });
    await userEvent.click(screen.getByLabelText('Tôi đã đọc điều khoản và ký hợp đồng thay mặt Studio.'));
  }

  it('shows the contract the studio received: its value at the budget, the steps and the unsigned PDF', () => {
    render(card(sent));
    expect(screen.getByText('Theo ngân sách')).toBeInTheDocument();
    expect(screen.getAllByText('200.000.000 VND')).toHaveLength(2);
    expect(screen.getByText(/Tải hợp đồng về, đọc kỹ tên phim/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tải hợp đồng chưa ký/ })).toHaveAttribute(
      'href',
      '/api/contracts/c1/documents/TEMPLATE',
    );
  });

  it('blocks signing with a link to the legal profile while it is incomplete', () => {
    render(card(sent, ['taxCode', 'bankAccount']));
    expect(screen.getByRole('alert')).toHaveTextContent('Còn thiếu: Mã số thuế, Số tài khoản.');
    expect(screen.getByRole('link', { name: 'Hoàn thiện hồ sơ pháp lý' })).toHaveAttribute('href', '/profile');
    expect(screen.queryByRole('button', { name: 'Ký hợp đồng' })).not.toBeInTheDocument();
  });

  it('links every signed copy of the round for download', () => {
    const doc = { fileName: 'k.pdf', sizeBytes: 10, checksum: 'x', uploadedAt: '2026-11-18T00:00:00.000Z' };
    render(
      card({
        ...sent,
        documents: [
          { ...doc, id: 'd1', side: 'STUDIO' },
          { ...doc, id: 'd2', side: 'FINAL' },
        ],
      }),
    );
    expect(screen.getByRole('link', { name: 'Bản Studio đã ký' })).toHaveAttribute('href', '/api/contracts/c1/documents/STUDIO');
    expect(screen.getByRole('link', { name: 'Bản đủ hai chữ ký' })).toHaveAttribute('href', '/api/contracts/c1/documents/FINAL');
  });

  it('signs at the budget by default, with no cost to type', async () => {
    vi.spyOn(HTMLFormElement.prototype, 'reportValidity').mockReturnValue(true);
    render(card(sent));
    expect(screen.queryByPlaceholderText('Ví dụ: 170.000.000')).not.toBeInTheDocument();
    await attachSignature();
    await userEvent.click(screen.getByRole('button', { name: 'Ký hợp đồng' }));
    expect(screen.getByRole('dialog', { name: 'Ký hợp đồng với chữ ký này?' })).toHaveTextContent('200.000.000 VND');
  });

  it('refuses a lower price that is in fact above the budget', async () => {
    vi.spyOn(HTMLFormElement.prototype, 'reportValidity').mockReturnValue(true);
    render(card(sent));
    await userEvent.click(screen.getByRole('button', { name: 'Đề xuất giá thấp hơn' }));
    await attachSignature();
    await userEvent.type(screen.getByPlaceholderText('Ví dụ: 170.000.000'), '250000000');
    await userEvent.click(screen.getByRole('button', { name: 'Ký hợp đồng' }));
    expect(screen.getByText('Giá đề xuất vượt ngân sách tối đa 200.000.000 VND.')).toBeInTheDocument();
  });

  it('asks for confirmation when Enter is pressed in the cost field, and sends only once confirmed', async () => {
    vi.spyOn(HTMLFormElement.prototype, 'reportValidity').mockReturnValue(true);
    actOnContract.mockClear();
    render(card(sent));
    await userEvent.click(screen.getByRole('button', { name: 'Đề xuất giá thấp hơn' }));
    await attachSignature();
    const cost = screen.getByPlaceholderText('Ví dụ: 170.000.000');
    await userEvent.type(cost, '120000000');
    // Enter in the only text field submits the form implicitly in browsers; jsdom needs the submit event fired.
    fireEvent.submit(cost.closest('form')!);
    fireEvent.submit(cost.closest('form')!);
    const dialog = screen.getByRole('dialog', { name: 'Ký hợp đồng với chữ ký này?' });
    expect(dialog).toHaveTextContent('120.000.000 VND');
    expect(actOnContract).not.toHaveBeenCalled();
    // jsdom's requestSubmit() validates against its own (empty) file list; the browser sees the uploaded file.
    (signatureInput() as HTMLInputElement).required = false;
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ký hợp đồng' }));
    await waitFor(() => expect(actOnContract).toHaveBeenCalledTimes(1));
  });

  it('refuses a JPEG renamed .png before the studio confirms', async () => {
    render(card({}));
    await userEvent.upload(signatureInput(), new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'chu-ky.png', { type: 'image/png' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('không khớp đuôi tệp');
    expect(screen.queryByRole('img', { name: 'Xem trước chữ ký của Studio' })).not.toBeInTheDocument();
  });

  it('says there is no budget to sign for instead of offering to sign at 0 VND', () => {
    render(card({ ...sent, budgetVnd: 0 }));
    expect(screen.getByRole('alert')).toHaveTextContent('chưa còn ngân sách sản xuất');
    expect(screen.queryByRole('button', { name: 'Ký hợp đồng' })).not.toBeInTheDocument();
  });

  it('offers nothing on a round waiting for the Admin', () => {
    render(card({ status: 'STUDIO_SIGNED', proposedBy: 'STUDIO', adminSignedAt: null, studioSignedAt: '2026-11-07T03:00:00Z' }));
    expect(screen.getByText('Studio đã ký – chờ Admin')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('EpisodeCard', () => {
  it('shows the change request and lets the studio deliver again', () => {
    render(<EpisodeCard projectId="p1" episode={episode({})} contractSigned />);
    expect(screen.getByText('Thay nhạc nền phút 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nộp lại phim/ })).toHaveAttribute('href', '/projects/p1/episodes/e1');
  });

  it('blocks delivery until the contract is signed', () => {
    render(<EpisodeCard projectId="p1" episode={episode({ status: 'AWAITING_MEDIA', latestDelivery: null })} contractSigned={false} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Hợp đồng chưa được ký đủ hai bên.')).toBeInTheDocument();
  });
});

describe('retrying a failed delivery', () => {
  beforeEach(() => retryDelivery.mockReset());
  const failed = (over: Partial<PortalEpisode> = {}) =>
    episode({
      status: 'PROCESSING',
      latestDelivery: { id: 'm9', version: 2, ingestStatus: 'FAILED', failureReason: 'Link không tải được', createdAt: '2026-11-07T03:00:00Z', changeRequest: null },
      ...over,
    });

  it('is offered only when the latest delivery failed', () => {
    const { unmount } = render(<EpisodeCard projectId="p1" episode={failed()} contractSigned />);
    expect(screen.getByRole('button', { name: 'Xử lý lại' })).toBeInTheDocument();
    unmount();
    render(<EpisodeCard projectId="p1" episode={episode({})} contractSigned />);
    expect(screen.queryByRole('button', { name: 'Xử lý lại' })).not.toBeInTheDocument();
  });

  it('sends the delivery id and shows the API refusal', async () => {
    retryDelivery.mockResolvedValueOnce({ error: 'Không thể thực hiện ở trạng thái hiện tại: newer delivery' });
    render(<EpisodeCard projectId="p1" episode={failed()} contractSigned />);
    await userEvent.click(screen.getByRole('button', { name: 'Xử lý lại' }));
    const dialog = screen.getByRole('dialog', { name: 'Xử lý lại bản 2?' });
    expect(retryDelivery).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xử lý lại' }));
    await waitFor(() => expect(retryDelivery).toHaveBeenCalled());
    expect((retryDelivery.mock.calls[0][1] as FormData).get('mediaAssetId')).toBe('m9');
    expect(await screen.findByRole('alert')).toHaveTextContent('newer delivery');
  });

  it('confirms once the delivery is sent back to processing', async () => {
    retryDelivery.mockResolvedValueOnce({ done: 'Đang xử lý lại video.' });
    render(<EpisodeCard projectId="p1" episode={failed()} contractSigned />);
    await userEvent.click(screen.getByRole('button', { name: 'Xử lý lại' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xử lý lại' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Đang xử lý lại video.');
  });

  it('sends nothing when the studio goes back from the confirmation', async () => {
    render(<EpisodeCard projectId="p1" episode={failed()} contractSigned />);
    const opener = screen.getByRole('button', { name: 'Xử lý lại' });
    await userEvent.click(opener);
    await userEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    await userEvent.click(opener);
    // Escape fires the dialog's `cancel` event in browsers (jsdom does not map the key itself).
    const dialog = screen.getByRole('dialog');
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(retryDelivery).not.toHaveBeenCalled();
  });
});
