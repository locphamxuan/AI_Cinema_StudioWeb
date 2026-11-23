'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { describeError } from '@/lib/api/http';
import { checkSignatureImage, parseCostVnd, type ContractAction } from '@/lib/domain/contract';
import { withPortal } from '@/lib/session/server';

export interface ContractActionState {
  error?: string;
  done?: string;
}

const DONE: Record<ContractAction, string> = {
  propose: 'Đã ký hợp đồng. Chờ Admin ký.',
  sign: 'Đã ký hợp đồng. Hợp đồng đã đủ hai chữ ký, dự án đã được giao cho Studio.',
  counter: 'Đã gửi đề xuất giá mới kèm chữ ký của Studio. Chờ Admin phản hồi.',
};

/**
 * One form for the three moves of the studio on a contract round; `action` says which. Each carries the studio's
 * signature image, which the system draws into the contract. Signing the contract it was sent (`propose`) carries a
 * cost only when the studio asks for less than the budget (`priceMode=lower`).
 */
export async function actOnContract(_previous: ContractActionState, form: FormData): Promise<ContractActionState> {
  const contractId = String(form.get('contractId') ?? '');
  const action = String(form.get('action') ?? '') as ContractAction;
  if (!contractId || !(action in DONE)) return { error: 'Yêu cầu không hợp lệ.' };
  if (form.get('agree') !== 'on') return { error: 'Vui lòng xác nhận đã đọc và đồng ý điều khoản trước khi ký.' };

  const signature = checkSignatureImage(form.get('file'));
  if (!signature.ok) return { error: signature.message };

  let cost: number | undefined;
  const named = action === 'counter' || (action === 'propose' && form.get('priceMode') === 'lower');
  if (named) {
    const parsed = parseCostVnd(String(form.get('costVnd') ?? ''));
    if (!parsed.ok) return { error: parsed.message };
    cost = parsed.value;
  }
  try {
    await withPortal((api) => {
      if (action === 'propose') return api.proposeCost(contractId, cost, signature.file);
      // A counter always names its cost: it was parsed above.
      if (action === 'counter') return api.counterCost(contractId, Number(cost), signature.file);
      return api.signContract(contractId, signature.file);
    });
  } catch (error) {
    unstable_rethrow(error);
    return { error: describeError(error) };
  }
  revalidatePath('/', 'layout');
  return { done: DONE[action] };
}
