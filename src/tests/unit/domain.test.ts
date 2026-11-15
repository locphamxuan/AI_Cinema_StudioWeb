import { describe, expect, it } from 'vitest';
import type { Contract } from '@/lib/api/types';
import {
  CONTRACT_STATUS_LABEL,
  contractActions,
  groupByProject,
  hasSignedContract,
  parseCostVnd,
} from '@/lib/domain/contract';
import { canRetry, canSubmit } from '@/lib/domain/episode';
import { daysUntil, formatDate, formatVnd } from '@/lib/format';
import { getConfig } from '@/lib/config';

const contract = (over: Partial<Contract>): Contract => ({
  id: 'c',
  projectId: 'p1',
  studioId: 's',
  round: 1,
  previousId: null,
  costVnd: null,
  proposedBy: null,
  status: 'SENT',
  terms: 'Điều khoản',
  adminSignedAt: null,
  adminSignedBy: null,
  studioSignedAt: null,
  createdAt: '2026-11-07T00:00:00Z',
  updatedAt: '2026-11-07T00:00:00Z',
  project: { id: 'p1', movie: { title: 'Mưa Sài Gòn' } },
  ...over,
});

describe('contract status → actions', () => {
  it('labels every status in Vietnamese', () => {
    expect(CONTRACT_STATUS_LABEL).toEqual({
      SENT: 'Chờ Studio báo giá',
      STUDIO_SIGNED: 'Studio đã ký – chờ Admin',
      ADMIN_COUNTERED: 'Admin đề xuất giá – chờ Studio',
      SIGNED: 'Đã ký đủ',
      SUPERSEDED: 'Đã thay thế',
    });
  });

  it.each([
    ['SENT', ['propose']],
    ['ADMIN_COUNTERED', ['sign', 'counter']],
    ['STUDIO_SIGNED', []],
    ['SIGNED', []],
    ['SUPERSEDED', []],
  ] as const)('%s allows %j', (status, actions) => {
    expect(contractActions(status)).toEqual(actions);
  });

  it('knows when a project has both signatures', () => {
    expect(hasSignedContract([{ status: 'SUPERSEDED' }, { status: 'ADMIN_COUNTERED' }])).toBe(false);
    expect(hasSignedContract([{ status: 'SUPERSEDED' }, { status: 'SIGNED' }])).toBe(true);
  });

  it('groups rounds per project, newest first, projects waiting for the studio first', () => {
    const groups = groupByProject([
      contract({ id: 'a1', projectId: 'A', round: 1, status: 'SIGNED', project: { id: 'A', movie: { title: 'A' } } }),
      contract({ id: 'b1', projectId: 'B', round: 1, status: 'SUPERSEDED' }),
      contract({ id: 'b2', projectId: 'B', round: 2, status: 'ADMIN_COUNTERED' }),
    ]);
    expect(groups.map((g) => [g.projectId, g.rounds.map((r) => r.id)])).toEqual([
      ['B', ['b2', 'b1']],
      ['A', ['a1']],
    ]);
  });
});

describe('parseCostVnd', () => {
  it.each(['170.000.000', '170 000 000', '170000000', '170,000,000 VND', '170.000.000đ'])('reads %s', (input) => {
    expect(parseCostVnd(input)).toEqual({ ok: true, value: 170_000_000 });
  });

  it.each([
    ['', 'Vui lòng nhập giá sản xuất.'],
    ['abc', 'Giá chỉ gồm chữ số (VND).'],
    ['-5000', 'Giá chỉ gồm chữ số (VND).'],
    ['500', 'Giá tối thiểu là 1.000 VND.'],
    ['1500', 'Giá phải là bội số của 1.000 VND.'],
    ['100000001000', 'Giá tối đa là 100.000.000.000 VND.'],
  ])('rejects %j', (input, message) => {
    expect(parseCostVnd(input)).toEqual({ ok: false, message });
  });
});

describe('canSubmit', () => {
  it('needs a signed contract', () => {
    expect(canSubmit(false, 'AWAITING_MEDIA')).toEqual({ allowed: false, reason: 'Hợp đồng chưa được ký đủ hai bên.' });
  });

  it.each(['AWAITING_MEDIA', 'IN_REVIEW', 'CHANGES_REQUESTED'] as const)('accepts %s', (status) => {
    expect(canSubmit(true, status)).toEqual({ allowed: true });
  });

  it.each(['DRAFT', 'PROCESSING', 'APPROVED', 'PUBLISHED'] as const)('refuses %s', (status) => {
    expect(canSubmit(true, status).allowed).toBe(false);
  });
});

describe('canRetry', () => {
  it('offers a new processing only for a failed delivery', () => {
    expect(canRetry({ ingestStatus: 'FAILED' })).toBe(true);
    expect(canRetry({ ingestStatus: 'READY' })).toBe(false);
    expect(canRetry({ ingestStatus: 'TRANSCODING' })).toBe(false);
    expect(canRetry(null)).toBe(false);
  });
});

describe('format', () => {
  it('formats VND with vi-VN grouping', () => {
    expect(formatVnd(170_000_000)).toBe('170.000.000 VND');
    expect(formatVnd(null)).toBe('Chưa có giá');
  });

  it('keeps the day of an API date', () => {
    expect(formatDate('2026-11-20T00:00:00.000Z')).toBe('20/11/2026');
    expect(formatDate(null)).toBe('-');
  });

  it('counts days until a deadline in Vietnam time', () => {
    const now = new Date('2026-11-07T20:00:00Z'); // 08/11 03:00 in Vietnam
    expect(daysUntil('2026-11-10T00:00:00.000Z', now)).toBe(2);
    expect(daysUntil('2026-11-08T00:00:00.000Z', now)).toBe(0);
    expect(daysUntil('2026-11-05T00:00:00.000Z', now)).toBe(-3);
  });
});

describe('getConfig', () => {
  it('defaults to the local API and strips a trailing slash', () => {
    expect(getConfig({}).apiUrl).toBe('http://localhost:3001/api');
    expect(getConfig({ AI_CINEMA_API_URL: 'https://api.example/api/' }).apiUrl).toBe('https://api.example/api');
  });

  it('uses secure cookies in production unless told otherwise', () => {
    expect(getConfig({ NODE_ENV: 'production' }).secureCookies).toBe(true);
    expect(getConfig({ NODE_ENV: 'production', COOKIE_SECURE: 'false' }).secureCookies).toBe(false);
    expect(getConfig({ NODE_ENV: 'development' }).secureCookies).toBe(false);
  });
});
