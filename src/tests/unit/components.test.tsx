// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Contract, PortalEpisode } from '@/lib/api/types';

vi.mock('@/app/actions/contracts', () => ({ actOnContract: vi.fn(async () => ({})) }));

import { ContractRound } from '@/components/ContractRound';
import { EpisodeCard } from '@/components/EpisodeCard';

const contract = (over: Partial<Contract>): Contract => ({
  id: 'c1',
  projectId: 'p1',
  studioId: 's',
  round: 2,
  previousId: 'c0',
  costVnd: 150_000_000,
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

describe('ContractRound', () => {
  it('lets the studio agree with or counter the Admin cost', async () => {
    render(<ContractRound contract={contract({})} />);
    expect(screen.getByText('Admin đề xuất giá – chờ Studio')).toBeInTheDocument();
    expect(screen.getAllByText('150.000.000 VND').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Đồng ý giá và ký' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Đề xuất giá khác' }));
    expect(screen.getByPlaceholderText('Ví dụ: 170.000.000')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('Ví dụ: 170.000.000'), '1500');
    expect(screen.getByText('Giá phải là bội số của 1.000 VND.')).toBeInTheDocument();
  });

  it('offers nothing on a round waiting for the Admin', () => {
    render(<ContractRound contract={contract({ status: 'STUDIO_SIGNED', proposedBy: 'STUDIO', adminSignedAt: null, studioSignedAt: '2026-11-07T03:00:00Z' })} />);
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
