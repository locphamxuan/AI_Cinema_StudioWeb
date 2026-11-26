import { ApiError } from '@/lib/api/http';
import type { Contract, ContractStatus } from '@/lib/api/types';

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  SENT: 'Chờ Studio ký',
  STUDIO_SIGNED: 'Studio đã ký – chờ Admin',
  ADMIN_COUNTERED: 'Admin đề xuất giá – chờ Studio',
  SIGNED: 'Đã ký đủ',
  SUPERSEDED: 'Đã thay thế',
};

export type ContractTone = 'action' | 'waiting' | 'done' | 'muted';

export const CONTRACT_STATUS_TONE: Record<ContractStatus, ContractTone> = {
  SENT: 'action',
  ADMIN_COUNTERED: 'action',
  STUDIO_SIGNED: 'waiting',
  SIGNED: 'done',
  SUPERSEDED: 'muted',
};

/** What the studio may do on a round: sign the contract it was sent; or agree with / counter the Admin. */
export type ContractAction = 'propose' | 'sign' | 'counter';

export function contractActions(status: ContractStatus): ContractAction[] {
  if (status === 'SENT') return ['propose'];
  if (status === 'ADMIN_COUNTERED') return ['sign', 'counter'];
  return [];
}

export const needsStudio = (contract: Pick<Contract, 'status'>) => contractActions(contract.status).length > 0;

/** Same bounds as the API (BR-45): whole thousands of VND, from 1,000 up to 100 billion. */
const MIN_COST_VND = 1_000;
const MAX_COST_VND = 100_000_000_000;

export type CostParse = { ok: true; value: number } | { ok: false; message: string };

/** Reads a cost typed by the studio: "170.000.000", "170 000 000" and "170000000" are the same amount. */
export function parseCostVnd(input: string): CostParse {
  const digits = input.replace(/[\s.,_]/g, '').replace(/(vnd|đ|₫)$/i, '');
  if (!digits) return { ok: false, message: 'Vui lòng nhập giá sản xuất.' };
  if (!/^\d+$/.test(digits)) return { ok: false, message: 'Giá chỉ gồm chữ số (VND).' };
  const value = Number(digits);
  if (value < MIN_COST_VND) return { ok: false, message: 'Giá tối thiểu là 1.000 VND.' };
  if (value > MAX_COST_VND) return { ok: false, message: 'Giá tối đa là 100.000.000.000 VND.' };
  if (value % 1000 !== 0) return { ok: false, message: 'Giá phải là bội số của 1.000 VND.' };
  return { ok: true, value };
}

/** Same limits as the API (signature-image.ts): PNG/JPEG, at most 2 MB, legible but not a page scan. */
export const SIGNATURE_MAX_BYTES = 2 * 1024 * 1024;
export const SIGNATURE_MIN_SIZE = { width: 150, height: 50 };
export const SIGNATURE_MAX_SIDE = 4000;

const SIGNATURE_EXTENSION = /\.(png|jpe?g)$/i;

export type SignatureCheck = { ok: true; file: File } | { ok: false; message: string };

/** Every signing move carries the studio's signature image (BE: field `file`, PNG or JPEG, at most 2 MB). */
export function checkSignatureImage(value: FormDataEntryValue | null): SignatureCheck {
  if (!(value instanceof File) || value.size === 0) {
    return { ok: false, message: 'Vui lòng chọn ảnh chữ ký của Studio.' };
  }
  // The API picks the kind by the file's extension, then checks the content against it.
  if (!SIGNATURE_EXTENSION.test(value.name)) return { ok: false, message: 'Ảnh chữ ký phải là file PNG hoặc JPG.' };
  if (value.size > SIGNATURE_MAX_BYTES) return { ok: false, message: 'Ảnh chữ ký tối đa 2 MB.' };
  return { ok: true, file: value };
}

/**
 * The first bytes of the chosen image against its extension, as the API checks them: a JPEG renamed .png (or the
 * other way round) is refused there, so it is refused here before the studio confirms.
 */
export function checkSignatureContent(name: string, head: Uint8Array): string | null {
  const png = [0x89, 0x50, 0x4e, 0x47].every((byte, index) => head[index] === byte);
  const jpeg = [0xff, 0xd8, 0xff].every((byte, index) => head[index] === byte);
  const matches = /\.png$/i.test(name) ? png : jpeg;
  return matches ? null : 'Nội dung ảnh chữ ký không khớp đuôi tệp (.png hoặc .jpg). Hãy lưu lại ảnh đúng định dạng rồi chọn lại.';
}

/** The size the browser read from the chosen image; null when it fits the signature block. */
export function checkSignatureSize(width: number, height: number): string | null {
  if (width < SIGNATURE_MIN_SIZE.width || height < SIGNATURE_MIN_SIZE.height) {
    return `Ảnh chữ ký quá nhỏ (${width}x${height} px), cần ít nhất ${SIGNATURE_MIN_SIZE.width}x${SIGNATURE_MIN_SIZE.height} px.`;
  }
  if (width > SIGNATURE_MAX_SIDE || height > SIGNATURE_MAX_SIDE) {
    return `Ảnh chữ ký quá lớn (${width}x${height} px), mỗi cạnh tối đa ${SIGNATURE_MAX_SIDE} px. Hãy cắt sát phần chữ ký.`;
  }
  return null;
}

/** A quote above the budget ceiling is refused by the API too; saying it here spares a round trip. */
export function checkWithinBudget(cost: number, budgetVnd: number): string | null {
  if (cost <= budgetVnd) return null;
  return `Giá đề xuất vượt ngân sách trần ${new Intl.NumberFormat('vi-VN').format(budgetVnd)} VND.`;
}

/** A counter-offer at the price already on the table changes nothing: the API refuses it, so it is said here first. */
export function checkNewCost(cost: number, current: number | null): string | null {
  if (current === null || cost !== current) return null;
  return 'Giá này bằng giá Admin đề xuất; hãy chọn "Đồng ý giá Admin" để ký.';
}

export const DOCUMENT_LABEL: Record<'ADMIN' | 'STUDIO' | 'FINAL', string> = {
  ADMIN: 'Bản Admin đã ký',
  STUDIO: 'Bản Studio đã ký',
  FINAL: 'Bản đủ hai chữ ký',
};

/** Where the browser downloads a signed copy: Studio Web's own route, which adds the session's token. */
export const documentHref = (contractId: string, side: string) =>
  `/api/contracts/${encodeURIComponent(contractId)}/documents/${side}`;

const contractTitle = (contract: Contract) => contract.project?.movie?.title ?? 'Dự án';

/** True once a round of the project carries both signatures: only then may the studio deliver films. */
export const hasSignedContract = (contracts: Pick<Contract, 'status'>[]) => contracts.some((c) => c.status === 'SIGNED');

export interface ProjectContracts {
  projectId: string;
  title: string;
  /** Newest round first: rounds[0] is where the negotiation stands. */
  rounds: Contract[];
}

/** Rounds grouped per project, each group newest round first; groups needing the studio come first. */
export function groupByProject(contracts: Contract[]): ProjectContracts[] {
  const groups = new Map<string, Contract[]>();
  for (const contract of contracts) groups.set(contract.projectId, [...(groups.get(contract.projectId) ?? []), contract]);
  return [...groups.entries()]
    .map(([projectId, rounds]) => {
      const sorted = [...rounds].sort((a, b) => b.round - a.round);
      return { projectId, title: contractTitle(sorted[0]), rounds: sorted };
    })
    .sort((a, b) => Number(needsStudio(b.rounds[0])) - Number(needsStudio(a.rounds[0])));
}

/** The sub-tabs of Hợp đồng và báo giá: where each project's negotiation stands, and every quote as history. */
export type ContractTab = 'todo' | 'waiting' | 'signed' | 'history';

export const CONTRACT_TABS: { key: ContractTab; label: string }[] = [
  { key: 'todo', label: 'Cần ký' },
  { key: 'waiting', label: 'Chờ Admin ký' },
  { key: 'signed', label: 'Đã ký đủ' },
  { key: 'history', label: 'Lịch sử báo giá' },
];

export const toContractTab = (value: string | undefined): ContractTab =>
  CONTRACT_TABS.some((tab) => tab.key === value) ? (value as ContractTab) : 'todo';

/** Which tab a project belongs to by its newest round; a round superseded by a studio change is history only. */
export function tabOfProject(group: ProjectContracts): Exclude<ContractTab, 'history'> | null {
  const { status } = group.rounds[0];
  if (needsStudio(group.rounds[0])) return 'todo';
  if (status === 'STUDIO_SIGNED') return 'waiting';
  if (status === 'SIGNED') return 'signed';
  return null;
}

/** The tab the project moves to once the studio's move went through. */
export const TAB_AFTER: Record<ContractAction, ContractTab> = { propose: 'waiting', sign: 'signed', counter: 'waiting' };

/** What the contracts page says after a move (`?notice=`): its outcome, or that the round changed meanwhile. */
export type ContractNotice = ContractAction | 'changed';

export const CONTRACT_NOTICE: Record<ContractNotice, { ok: boolean; text: string }> = {
  propose: { ok: true, text: 'Đã ký hợp đồng. Hợp đồng đang chờ Admin AI Cinema ký phần Bên A.' },
  sign: { ok: true, text: 'Đã ký hợp đồng. Hợp đồng đã đủ hai chữ ký, dự án đã được giao cho Studio.' },
  counter: { ok: true, text: 'Đã gửi đề xuất giá mới kèm chữ ký của Studio. Chờ Admin phản hồi.' },
  changed: {
    ok: false,
    text: 'Hợp đồng vừa được AI Cinema cập nhật trong lúc Studio đang thao tác nên chưa ký được. Trang đã tải lại trạng thái mới nhất; hãy xem lại hợp đồng rồi thao tác lại.',
  },
};

export const toContractNotice = (value: string | undefined): ContractNotice | null =>
  value && Object.hasOwn(CONTRACT_NOTICE, value) ? (value as ContractNotice) : null;

/**
 * True when the API refused a move because the round is no longer the one on screen: the Admin countered, signed or
 * replaced it, or the project left negotiation (409 on the round's status), or the round is gone (404).
 */
export function isStaleRound(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 404) return true;
  return error.status === 409 && /a contract that is |can no longer be answered|no longer waiting/.test(error.message);
}

export interface Page<T> {
  items: T[];
  page: number;
  pages: number;
}

/** One page of a list (1-based); a page out of range shows the last one. */
export function paginate<T>(items: T[], page: number, size: number): Page<T> {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1), pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages };
}
