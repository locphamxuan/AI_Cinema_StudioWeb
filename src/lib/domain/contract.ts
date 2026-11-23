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

export type SignatureCheck = { ok: true; file: File } | { ok: false; message: string };

/** Every signing move carries the studio's signature image (BE: field `file`, PNG or JPEG, at most 2 MB). */
export function checkSignatureImage(value: FormDataEntryValue | null): SignatureCheck {
  if (!(value instanceof File) || value.size === 0) {
    return { ok: false, message: 'Vui lòng chọn ảnh chữ ký của Studio.' };
  }
  const name = value.name.toLowerCase();
  const isImage = ['image/png', 'image/jpeg'].includes(value.type) || /\.(png|jpe?g)$/.test(name);
  if (!isImage) return { ok: false, message: 'Ảnh chữ ký phải là file PNG hoặc JPG.' };
  if (value.size > SIGNATURE_MAX_BYTES) return { ok: false, message: 'Ảnh chữ ký tối đa 2 MB.' };
  return { ok: true, file: value };
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
