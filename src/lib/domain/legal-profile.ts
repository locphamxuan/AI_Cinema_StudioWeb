import type { LegalProfileField, LegalProfileInput } from '@/lib/api/types';

export const LEGAL_FIELD_LABEL: Record<LegalProfileField, string> = {
  address: 'Địa chỉ trụ sở',
  taxCode: 'Mã số thuế',
  bankAccount: 'Số tài khoản',
  bankName: 'Ngân hàng',
  representativeTitle: 'Chức vụ người đại diện',
  contactName: 'Người đại diện (Admin nhập)',
};

export type ProfileErrors = Partial<Record<keyof LegalProfileInput, string>>;
export type ProfileCheck = { ok: true; value: LegalProfileInput } | { ok: false; errors: ProfileErrors };

const text = (form: FormData, key: keyof LegalProfileInput) => String(form.get(key) ?? '').trim();

/** Same rules as the API (UpdateStudioLegalProfileRequestDto): every field required, trimmed. */
export function checkLegalProfile(form: FormData): ProfileCheck {
  const value: LegalProfileInput = {
    address: text(form, 'address'),
    taxCode: text(form, 'taxCode'),
    bankAccount: text(form, 'bankAccount').replace(/[\s.-]/g, ''),
    bankName: text(form, 'bankName'),
    representativeTitle: text(form, 'representativeTitle'),
  };
  const errors: ProfileErrors = {};
  if (value.address.length < 10) errors.address = 'Nhập đầy đủ địa chỉ trụ sở (ít nhất 10 ký tự).';
  else if (value.address.length > 500) errors.address = 'Địa chỉ tối đa 500 ký tự.';
  if (!/^\d{10}(-\d{3})?$/.test(value.taxCode)) {
    errors.taxCode = 'Mã số thuế gồm 10 chữ số, hoặc 10 chữ số, dấu "-" và 3 chữ số (chi nhánh).';
  }
  if (!/^\d{6,19}$/.test(value.bankAccount)) errors.bankAccount = 'Số tài khoản gồm 6 đến 19 chữ số.';
  if (value.bankName.length < 2 || value.bankName.length > 255) errors.bankName = 'Nhập tên ngân hàng và chi nhánh.';
  if (value.representativeTitle.length < 2 || value.representativeTitle.length > 100) {
    errors.representativeTitle = 'Nhập chức vụ của người đại diện, ví dụ Giám đốc.';
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}
