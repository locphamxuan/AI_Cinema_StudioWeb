import type { Contract, ContractStatus } from '@/lib/api/types';

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  SENT: 'Chờ Studio báo giá',
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

/** What the studio may do on a round: fill in the cost and sign the template; or agree with / counter the Admin. */
export type ContractAction = 'propose' | 'sign' | 'counter';

export function contractActions(status: ContractStatus): ContractAction[] {
  if (status === 'SENT') return ['propose'];
  if (status === 'ADMIN_COUNTERED') return ['sign', 'counter'];
  return [];
}

export const needsStudio = (contract: Pick<Contract, 'status'>) => contractActions(contract.status).length > 0;

/** Same bounds as the API (BR-45): whole thousands of VND, from 1,000 up to 100 billion. */
export const MIN_COST_VND = 1_000;
export const MAX_COST_VND = 100_000_000_000;

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

export const contractTitle = (contract: Contract) => contract.project?.movie?.title ?? 'Dự án';

/** True once a round of the project carries both signatures: only then may the studio deliver films. */
export const hasSignedContract = (contracts: Pick<Contract, 'status'>[]) => contracts.some((c) => c.status === 'SIGNED');

/** Rounds grouped per project, each group newest round first; groups needing the studio come first. */
export function groupByProject(contracts: Contract[]): { projectId: string; title: string; rounds: Contract[] }[] {
  const groups = new Map<string, Contract[]>();
  for (const contract of contracts) groups.set(contract.projectId, [...(groups.get(contract.projectId) ?? []), contract]);
  return [...groups.entries()]
    .map(([projectId, rounds]) => {
      const sorted = [...rounds].sort((a, b) => b.round - a.round);
      return { projectId, title: contractTitle(sorted[0]), rounds: sorted };
    })
    .sort((a, b) => Number(needsStudio(b.rounds[0])) - Number(needsStudio(a.rounds[0])));
}
