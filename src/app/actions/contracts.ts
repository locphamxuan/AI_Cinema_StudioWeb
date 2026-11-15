'use server';

import { revalidatePath } from 'next/cache';
import { describeError } from '@/lib/api/http';
import { checkSignedPdf, parseCostVnd, type ContractAction } from '@/lib/domain/contract';
import { withPortal } from '@/lib/session/server';

export interface ContractActionState {
  error?: string;
  done?: string;
}

const DONE: Record<ContractAction, string> = {
  propose: 'Đã gửi giá và ký hợp đồng. Chờ Admin phản hồi.',
  sign: 'Đã ký hợp đồng. Hợp đồng đã đủ hai chữ ký, dự án được bàn giao cho Studio.',
  counter: 'Đã gửi đề xuất giá mới kèm chữ ký Studio. Chờ Admin phản hồi.',
};

/** One form for the three moves of the studio on a contract round; `action` says which. */
export async function actOnContract(_previous: ContractActionState, form: FormData): Promise<ContractActionState> {
  const contractId = String(form.get('contractId') ?? '');
  const action = String(form.get('action') ?? '') as ContractAction;
  if (!contractId || !(action in DONE)) return { error: 'Yêu cầu không hợp lệ.' };
  if (form.get('agree') !== 'on') return { error: 'Vui lòng xác nhận đã đọc và đồng ý điều khoản trước khi ký.' };

  const pdf = checkSignedPdf(form.get('file'));
  if (!pdf.ok) return { error: pdf.message };

  let cost = 0;
  if (action !== 'sign') {
    const parsed = parseCostVnd(String(form.get('costVnd') ?? ''));
    if (!parsed.ok) return { error: parsed.message };
    cost = parsed.value;
  }
  try {
    await withPortal((api) => {
      if (action === 'propose') return api.proposeCost(contractId, cost, pdf.file);
      if (action === 'counter') return api.counterCost(contractId, cost, pdf.file);
      return api.signContract(contractId, pdf.file);
    });
  } catch (error) {
    return { error: describeError(error) };
  }
  revalidatePath('/', 'layout');
  return { done: DONE[action] };
}
