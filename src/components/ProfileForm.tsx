'use client';

import { useActionState } from 'react';
import { saveProfile, type ProfileState } from '@/app/actions/profile';
import type { LegalProfileInput, StudioLegalProfile } from '@/lib/api/types';
import { LEGAL_FIELD_LABEL } from '@/lib/domain/legal-profile';
import { BUTTON, ErrorCard, INPUT, SuccessCard } from './ui';

/** `maxLength` as the API's limits (bankAccount leaves room for the spaces and dots that group its digits). */
const FIELDS: { name: keyof LegalProfileInput; hint: string; placeholder: string; maxLength: number; inputMode?: 'numeric' }[] = [
  { name: 'address', hint: 'Như trên giấy chứng nhận đăng ký doanh nghiệp.', placeholder: 'Số nhà, đường, phường, quận, tỉnh/thành', maxLength: 500 },
  { name: 'taxCode', hint: '10 chữ số, hoặc 10 chữ số, dấu "-" và 3 chữ số với chi nhánh.', placeholder: '0312345678', maxLength: 14, inputMode: 'numeric' },
  { name: 'bankAccount', hint: 'Tài khoản nhận thanh toán, 6 đến 19 chữ số.', placeholder: '0123456789', maxLength: 30, inputMode: 'numeric' },
  { name: 'bankName', hint: 'Tên ngân hàng và chi nhánh.', placeholder: 'Ngân hàng TMCP Á Châu, CN Quận 1', maxLength: 255 },
  { name: 'representativeTitle', hint: 'Chức vụ của người ký hợp đồng.', placeholder: 'Giám đốc', maxLength: 100 },
];

/** The studio fills in its own Bên B; checked here and again by the API. */
export function ProfileForm({ profile }: { profile: StudioLegalProfile }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  const value = (name: keyof LegalProfileInput) => state.values?.[name] ?? profile[name] ?? '';
  return (
    <form action={action} noValidate className="space-y-4">
      {state.done && <SuccessCard message={state.done} />}
      {state.error && <ErrorCard message={state.error} />}
      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map(({ name, hint, placeholder, maxLength, inputMode }) => {
          const error = state.errors?.[name];
          return (
            <label key={name} className={`block space-y-1.5 text-sm ${name === 'address' ? 'md:col-span-2' : ''}`}>
              <span className="block text-xs font-semibold text-muted">{LEGAL_FIELD_LABEL[name]}</span>
              <input
                key={`${name}-${value(name)}`}
                name={name}
                required
                inputMode={inputMode}
                maxLength={maxLength}
                defaultValue={value(name)}
                placeholder={placeholder}
                aria-invalid={error ? true : undefined}
                aria-describedby={`${name}-hint`}
                className={INPUT}
              />
              <span id={`${name}-hint`} className={`block text-xs ${error ? 'text-red-600 dark:text-red-300' : 'text-muted'}`}>
                {error ?? hint}
              </span>
            </label>
          );
        })}
      </div>
      <button type="submit" disabled={pending} className={BUTTON}>
        {pending ? 'Đang lưu…' : 'Lưu hồ sơ pháp lý'}
      </button>
    </form>
  );
}
