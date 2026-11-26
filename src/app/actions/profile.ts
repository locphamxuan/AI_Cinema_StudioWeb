'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { describeError } from '@/lib/api/http';
import type { LegalProfileInput } from '@/lib/api/types';
import { checkLegalProfile, type ProfileErrors } from '@/lib/domain/legal-profile';
import { withPortal } from '@/lib/session/server';

export interface ProfileState {
  error?: string;
  errors?: ProfileErrors;
  done?: string;
  /** What was typed, shown again when the form is refused. */
  values?: Partial<LegalProfileInput>;
}

/** Saves the studio's legal profile (Bên B of its contracts); it is checked here first, then by the API. */
export async function saveProfile(_previous: ProfileState, form: FormData): Promise<ProfileState> {
  const checked = checkLegalProfile(form);
  if (!checked.ok) {
    const values = Object.fromEntries(['address', 'taxCode', 'bankAccount', 'bankName', 'representativeTitle'].map((k) => [k, String(form.get(k) ?? '')]));
    return { errors: checked.errors, values };
  }
  try {
    await withPortal((api) => api.updateProfile(checked.value));
  } catch (error) {
    unstable_rethrow(error);
    return { error: describeError(error), values: checked.value };
  }
  revalidatePath('/', 'layout');
  return { done: 'Đã lưu hồ sơ pháp lý. Các hợp đồng sẽ in thông tin này ở phần Bên B.', values: checked.value };
}
