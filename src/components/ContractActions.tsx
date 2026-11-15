'use client';

import { useActionState, useState } from 'react';
import { PenLine } from 'lucide-react';
import { actOnContract, type ContractActionState } from '@/app/actions/contracts';
import { parseCostVnd, type ContractAction } from '@/lib/domain/contract';
import { formatVnd } from '@/lib/format';
import { BUTTON, BUTTON_GHOST, ErrorCard, INPUT, SuccessCard } from './ui';

const SUBMIT_LABEL: Record<ContractAction, string> = {
  propose: 'Gửi giá và ký',
  sign: 'Đồng ý giá và ký',
  counter: 'Gửi đề xuất giá khác',
};

function CostField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const parsed = value ? parseCostVnd(value) : null;
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="block text-xs font-semibold text-muted">Giá sản xuất (VND, bội số 1.000)</span>
      <input
        name="costVnd"
        inputMode="numeric"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT}
        placeholder="Ví dụ: 170.000.000"
      />
      {parsed && (
        <span className={`block text-xs ${parsed.ok ? 'text-muted' : 'text-red-600 dark:text-red-300'}`}>
          {parsed.ok ? `= ${formatVnd(parsed.value)}` : parsed.message}
        </span>
      )}
    </label>
  );
}

/** The studio's move on a round waiting for it: fill in the cost (SENT), or agree / counter the Admin (ADMIN_COUNTERED). */
export function ContractActions({
  contractId,
  actions,
  adminCost,
}: {
  contractId: string;
  actions: ContractAction[];
  adminCost: number | null;
}) {
  const [state, formAction, pending] = useActionState<ContractActionState, FormData>(actOnContract, {});
  const [mode, setMode] = useState<ContractAction>(actions[0]);
  const [cost, setCost] = useState('');

  if (state.done) return <SuccessCard message={state.done} />;
  const needsCost = mode !== 'sign';
  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-background p-4 sm:p-5">
      <input type="hidden" name="contractId" value={contractId} />
      <input type="hidden" name="action" value={mode} />
      {actions.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lựa chọn của Studio">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => setMode(action)}
              aria-pressed={mode === action}
              className={`${BUTTON_GHOST} text-xs aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-white dark:aria-pressed:text-slate-900`}
            >
              {action === 'sign' ? 'Đồng ý giá Admin' : 'Đề xuất giá khác'}
            </button>
          ))}
        </div>
      )}
      {mode === 'sign' && adminCost !== null && (
        <p className="text-sm">
          Ký đồng ý với giá Admin đề xuất: <strong className="font-mono">{formatVnd(adminCost)}</strong>. Hợp đồng sẽ đủ hai chữ ký.
        </p>
      )}
      {needsCost && <CostField value={cost} onChange={setCost} />}
      <label className="block space-y-1.5 text-sm">
        <span className="block text-xs font-semibold text-muted">Hợp đồng Studio đã ký (PDF, tối đa 10 MB)</span>
        <input
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          required
          className={`${INPUT} file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white dark:file:text-slate-900`}
        />
        <span className="block text-xs text-muted">
          In điều khoản ở trên{needsCost ? ' kèm giá đã nhập' : ''}, ký và đóng dấu rồi tải bản PDF lên; hệ thống ghép với bản Admin đã ký.
        </span>
      </label>
      <label className="flex items-start gap-2.5 text-sm cursor-pointer">
        <input type="checkbox" name="agree" required className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
        <span>Tôi đã đọc điều khoản và ký hợp đồng thay mặt Studio.</span>
      </label>
      {state.error && <ErrorCard message={state.error} />}
      <button type="submit" disabled={pending} className={BUTTON}>
        <PenLine className="h-4 w-4" aria-hidden="true" />
        {pending ? 'Đang gửi…' : SUBMIT_LABEL[mode]}
      </button>
    </form>
  );
}
