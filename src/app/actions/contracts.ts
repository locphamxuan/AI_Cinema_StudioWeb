'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { ApiError, describeError } from '@/lib/api/http';
import {
  checkSignatureImage,
  isStaleRound,
  parseCostVnd,
  TAB_AFTER,
  type ContractAction,
  type ContractNotice,
  type ContractTab,
} from '@/lib/domain/contract';
import { withPortal } from '@/lib/session/server';

export interface ContractActionState {
  error?: string;
}

const ACTIONS: readonly ContractAction[] = ['propose', 'sign', 'counter'];

/** Reloads every page's data and shows the contracts tab with what happened (the project left the tab it was in). */
function showContracts(tab: ContractTab, notice: ContractNotice): never {
  revalidatePath('/', 'layout');
  redirect(`/contracts?tab=${tab}&notice=${notice}`);
}

/**
 * One form for the three moves of the studio on a contract round; `action` says which. Each carries the studio's
 * signature image, which the system draws into the contract. Signing the contract it was sent (`propose`) carries a
 * cost only when the studio asks for less than the budget (`priceMode=lower`).
 */
export async function actOnContract(_previous: ContractActionState, form: FormData): Promise<ContractActionState> {
  const contractId = String(form.get('contractId') ?? '');
  const action = String(form.get('action') ?? '') as ContractAction;
  if (!contractId || !ACTIONS.includes(action)) return { error: 'Yêu cầu không hợp lệ.' };
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
    // The Admin moved the round on while the studio was on the page: show where it stands now.
    if (isStaleRound(error)) showContracts('todo', 'changed');
    // Any other conflict (profile incomplete, budget changed) is explained on a page reloaded with current data.
    if (error instanceof ApiError && error.status === 409) revalidatePath('/', 'layout');
    return { error: describeError(error) };
  }
  showContracts(TAB_AFTER[action], action);
}
