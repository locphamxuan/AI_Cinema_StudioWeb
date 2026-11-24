import { describe, expect, it } from 'vitest';
import type { Contract } from '@/lib/api/types';
import { ApiError } from '@/lib/api/http';
import {
  checkNewCost,
  checkSignatureContent,
  checkSignatureImage,
  checkSignatureSize,
  CONTRACT_STATUS_LABEL,
  contractActions,
  groupByProject,
  hasSignedContract,
  paginate,
  parseCostVnd,
  isStaleRound,
  tabOfProject,
  toContractNotice,
  toContractTab,
} from '@/lib/domain/contract';
import { checkLegalProfile } from '@/lib/domain/legal-profile';
import { canRetry, canSubmit } from '@/lib/domain/episode';
import { daysUntil, formatBytes, formatDate, formatVnd } from '@/lib/format';
import { getConfig } from '@/lib/config';

const contract = (over: Partial<Contract>): Contract => ({
  id: 'c',
  projectId: 'p1',
  studioId: 's',
  round: 1,
  previousId: null,
  costVnd: null,
  budgetVnd: 200_000_000,
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
      SENT: 'Chờ Studio ký',
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

describe('contract tabs and paging', () => {
  const group = (status: Contract['status']) => ({ projectId: 'p', title: 'P', rounds: [contract({ status })] });

  it('files each project under the tab of its newest round', () => {
    expect(tabOfProject(group('SENT'))).toBe('todo');
    expect(tabOfProject(group('ADMIN_COUNTERED'))).toBe('todo');
    expect(tabOfProject(group('STUDIO_SIGNED'))).toBe('waiting');
    expect(tabOfProject(group('SIGNED'))).toBe('signed');
    // A negotiation superseded by a studio change only stays in the quote history.
    expect(tabOfProject(group('SUPERSEDED'))).toBeNull();
    expect(toContractTab('history')).toBe('history');
    expect(toContractTab('anything')).toBe('todo');
  });

  it('pages a list and keeps the page in range', () => {
    const items = [1, 2, 3, 4, 5];
    expect(paginate(items, 2, 2)).toEqual({ items: [3, 4], page: 2, pages: 3 });
    expect(paginate(items, 9, 2)).toEqual({ items: [5], page: 3, pages: 3 });
    expect(paginate(items, Number.NaN, 2).page).toBe(1);
    expect(paginate([], 1, 2)).toEqual({ items: [], page: 1, pages: 1 });
  });
});

describe('signature image checks', () => {
  it('takes a PNG or JPG of at most 2 MB', () => {
    expect(checkSignatureImage(new File(['x'], 'ky.jpg', { type: 'image/jpeg' })).ok).toBe(true);
    expect(checkSignatureImage(null)).toEqual({ ok: false, message: 'Vui lòng chọn ảnh chữ ký của Studio.' });
    expect(checkSignatureImage(new File(['x'], 'ky.gif', { type: 'image/gif' }))).toMatchObject({ ok: false });
    const heavy = new File(['x'], 'ky.png', { type: 'image/png' });
    Object.defineProperty(heavy, 'size', { value: 2 * 1024 * 1024 + 1 });
    expect(checkSignatureImage(heavy)).toEqual({ ok: false, message: 'Ảnh chữ ký tối đa 2 MB.' });
  });

  it('goes by the extension as the API does, whatever type the browser reports', () => {
    expect(checkSignatureImage(new File(['x'], 'KY.PNG', { type: '' })).ok).toBe(true);
    expect(checkSignatureImage(new File(['x'], 'chu-ky', { type: 'image/png' }))).toMatchObject({ ok: false });
  });

  it('refuses content that does not match the extension', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(checkSignatureContent('ky.png', png)).toBeNull();
    expect(checkSignatureContent('ky.JPEG', jpeg)).toBeNull();
    expect(checkSignatureContent('ky.png', jpeg)).toContain('không khớp đuôi tệp');
    expect(checkSignatureContent('ky.jpg', png)).toContain('không khớp đuôi tệp');
  });

  it('wants a size that prints legibly in the signature block', () => {
    expect(checkSignatureSize(600, 200)).toBeNull();
    expect(checkSignatureSize(149, 200)).toContain('quá nhỏ');
    expect(checkSignatureSize(4001, 200)).toContain('quá lớn');
  });
});

describe('a round that changed meanwhile', () => {
  it('is a 409 on the round status or project, or a 404; other refusals are not', () => {
    const conflict = (message: string) => new ApiError(409, 'CONFLICT', message);
    expect(isStaleRound(conflict('Cannot sign a contract that is SIGNED (expected ADMIN_COUNTERED)'))).toBe(true);
    expect(isStaleRound(conflict('The project is CANCELLED; its contract can no longer be answered'))).toBe(true);
    expect(isStaleRound(new ApiError(404, 'NOT_FOUND', 'Contract not found'))).toBe(true);
    expect(isStaleRound(conflict('The fee (1 VND) is more than the budget left (0 VND); ask the Admin for more production cost'))).toBe(false);
    expect(isStaleRound(new Error('offline'))).toBe(false);
    // A round signed before signature images is not stale: it needs a new round, which the page then shows.
    expect(isStaleRound(conflict("The other side's signature image of this round is missing; the round must be sent again"))).toBe(false);
  });

  it('refuses a counter-offer at the price the Admin already proposed', () => {
    expect(checkNewCost(150_000_000, 150_000_000)).toContain('bằng giá Admin đề xuất');
    expect(checkNewCost(160_000_000, 150_000_000)).toBeNull();
    expect(checkNewCost(160_000_000, null)).toBeNull();
  });

  it('reads the notice of the contracts page from its URL', () => {
    expect(toContractNotice('changed')).toBe('changed');
    expect(toContractNotice('sign')).toBe('sign');
    expect(toContractNotice('toString')).toBeNull();
    expect(toContractNotice(undefined)).toBeNull();
  });
});

describe('checkLegalProfile', () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    return data;
  };
  const VALID = {
    address: ' 12 Nguyễn Huệ, Quận 1 ',
    taxCode: '0312345678-001',
    bankAccount: '0123 456.789',
    bankName: 'ACB',
    representativeTitle: 'Giám đốc',
  };

  it('trims the fields and keeps only the digits of the account', () => {
    expect(checkLegalProfile(form(VALID))).toEqual({
      ok: true,
      value: { ...VALID, address: '12 Nguyễn Huệ, Quận 1', bankAccount: '0123456789' },
    });
  });

  it('names each field that is wrong', () => {
    const checked = checkLegalProfile(form({ ...VALID, taxCode: '12345', bankAccount: '12ab', representativeTitle: ' ' }));
    expect(checked.ok).toBe(false);
    expect(Object.keys(checked.ok ? {} : checked.errors).sort()).toEqual(['bankAccount', 'representativeTitle', 'taxCode']);
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

  it('formats file sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB');
    expect(formatBytes(2048 * 1024 * 1024)).toBe('2 GB');
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

  it('links back to the login page of the AI Cinema web', () => {
    expect(getConfig({}).webLoginUrl).toBe('http://localhost:3000/login');
    expect(getConfig({ AI_CINEMA_WEB_URL: 'https://web.example/' }).webLoginUrl).toBe('https://web.example/login');
    expect(getConfig({ AI_CINEMA_WEB_URL: 'https://web.example/login' }).webLoginUrl).toBe('https://web.example/login');
  });

  it('uses secure cookies in production unless told otherwise', () => {
    expect(getConfig({ NODE_ENV: 'production' }).secureCookies).toBe(true);
    expect(getConfig({ NODE_ENV: 'production', COOKIE_SECURE: 'false' }).secureCookies).toBe(false);
    expect(getConfig({ NODE_ENV: 'development' }).secureCookies).toBe(false);
  });
});
