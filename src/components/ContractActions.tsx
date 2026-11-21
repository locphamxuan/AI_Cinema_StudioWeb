'use client';

import { useActionState, useCallback, useRef, useState } from 'react';
import { PenLine } from 'lucide-react';
import { actOnContract, type ContractActionState } from '@/app/actions/contracts';
import { checkSignedPdf, checkWithinBudget, parseCostVnd, type ContractAction } from '@/lib/domain/contract';
import { formatBytes, formatVnd } from '@/lib/format';
import { ConfirmDialog } from './ConfirmDialog';
import { BUTTON, BUTTON_GHOST, ErrorCard, INPUT, SuccessCard } from './ui';

const SUBMIT_LABEL: Record<ContractAction, string> = {
  propose: 'Gửi hợp đồng đã ký',
  sign: 'Đồng ý giá và ký',
  counter: 'Gửi đề xuất giá khác',
};

const CONFIRM_TITLE: Record<ContractAction, string> = {
  propose: 'Gửi hợp đồng Studio đã ký?',
  sign: 'Đồng ý giá Admin và ký hợp đồng?',
  counter: 'Gửi đề xuất giá khác?',
};

const CONFIRM_NOTE: Record<ContractAction, string> = {
  propose: 'Sau khi gửi, Studio không sửa được vòng này; Admin sẽ ký phần Bên A hoặc đề xuất giá khác.',
  sign: 'Hợp đồng sẽ đủ hai chữ ký và không thể huỷ trên Studio Web.',
  counter: 'Một vòng mới được mở với giá này; Admin sẽ ký đồng ý hoặc đề xuất lại.',
};

/** On the contract it was sent, the studio signs at the budget or asks for less. */
type PriceMode = 'budget' | 'lower';

function CostField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const parsed = value ? parseCostVnd(value) : null;
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="block text-xs font-semibold text-muted">Giá sản xuất (VND, bội số 1.000)</span>
      <input
        name="costVnd"
        inputMode="numeric"
        autoComplete="off"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT}
        placeholder="Ví dụ: 170.000.000"
        aria-invalid={parsed ? !parsed.ok : undefined}
      />
      {parsed && (
        <span className={`block text-xs ${parsed.ok ? 'text-muted' : 'text-red-600 dark:text-red-300'}`}>
          {parsed.ok ? `= ${formatVnd(parsed.value)}` : parsed.message}
        </span>
      )}
    </label>
  );
}

/**
 * The studio's move on a round waiting for it: upload its signed copy of the contract it was sent, at the budget
 * or at a lower cost (SENT), or agree with / counter the Admin (ADMIN_COUNTERED).
 */
export function ContractActions({
  contractId,
  actions,
  adminCost,
  budgetVnd,
}: {
  contractId: string;
  actions: ContractAction[];
  adminCost: number | null;
  budgetVnd: number;
}) {
  const [state, formAction, pending] = useActionState<ContractActionState, FormData>(actOnContract, {});
  const [mode, setMode] = useState<ContractAction>(actions[0]);
  const [priceMode, setPriceMode] = useState<PriceMode>('budget');
  const [cost, setCost] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  /** Set only by the dialog's confirm button: any other submit (Enter in the cost field) goes through review(). */
  const confirmedRef = useRef(false);
  const closeConfirm = useCallback(() => setConfirming(false), []);

  if (state.done) return <SuccessCard message={state.done} />;
  const needsCost = mode === 'counter' || (mode === 'propose' && priceMode === 'lower');
  const parsedCost = parseCostVnd(cost);
  const signedCost = mode === 'sign' ? adminCost : mode === 'propose' && priceMode === 'budget' ? budgetVnd : null;

  /** Checks the form in the browser first (the 10 MB limit included), then asks for confirmation. */
  function review() {
    const form = formRef.current;
    if (!form?.reportValidity()) return;
    const pdf = checkSignedPdf(file);
    if (!pdf.ok) return setProblem(pdf.message);
    if (needsCost && !parsedCost.ok) return setProblem(parsedCost.message);
    const overBudget = needsCost && parsedCost.ok ? checkWithinBudget(parsedCost.value, budgetVnd) : null;
    if (overBudget) return setProblem(overBudget);
    setProblem(null);
    setConfirming(true);
  }

  function confirm() {
    setConfirming(false);
    confirmedRef.current = true;
    formRef.current?.requestSubmit();
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    const confirmed = confirmedRef.current;
    confirmedRef.current = false;
    if (confirmed && !pending) return;
    event.preventDefault();
    if (!pending) review();
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-background p-4 sm:p-5">
      <input type="hidden" name="contractId" value={contractId} />
      <input type="hidden" name="action" value={mode} />
      <input type="hidden" name="priceMode" value={priceMode} />
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
      {mode === 'propose' && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Giá Studio ký">
          {(['budget', 'lower'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPriceMode(option)}
              aria-pressed={priceMode === option}
              className={`${BUTTON_GHOST} text-xs aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-white dark:aria-pressed:text-slate-900`}
            >
              {option === 'budget' ? `Ký đúng ngân sách ${formatVnd(budgetVnd)}` : 'Đề xuất giá thấp hơn'}
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
          onChange={(event) => {
            const chosen = event.target.files?.[0] ?? null;
            setFile(chosen);
            const check = chosen ? checkSignedPdf(chosen) : null;
            setProblem(check && !check.ok ? check.message : null);
          }}
          className={`${INPUT} file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white dark:file:text-slate-900`}
        />
        <span className="block text-xs text-muted">
          Tải lên đúng hợp đồng đã tải về{needsCost ? ', sửa giá trị thành giá đã nhập' : ''}, có chữ ký và con dấu của Studio; file của dự án khác bị từ chối.
        </span>
      </label>
      <label className="flex items-start gap-2.5 text-sm cursor-pointer">
        <input type="checkbox" name="agree" required className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
        <span>Tôi đã đọc điều khoản và ký hợp đồng thay mặt Studio.</span>
      </label>
      {(problem ?? state.error) && <ErrorCard message={problem ?? state.error ?? ''} />}
      <button type="button" onClick={review} disabled={pending} className={BUTTON}>
        <PenLine className="h-4 w-4" aria-hidden="true" />
        {pending ? 'Đang gửi…' : SUBMIT_LABEL[mode]}
      </button>
      <ConfirmDialog open={confirming} title={CONFIRM_TITLE[mode]} confirmLabel={SUBMIT_LABEL[mode]} onConfirm={confirm} onCancel={closeConfirm}>
        <p>
          Giá sản xuất:{' '}
          <strong className="tabular-nums">{needsCost ? (parsedCost.ok ? formatVnd(parsedCost.value) : '-') : formatVnd(signedCost)}</strong>
        </p>
        {file && (
          <p className="break-words">
            Hợp đồng đã ký: <strong>{file.name}</strong> ({formatBytes(file.size)})
          </p>
        )}
        <p className="text-muted">{CONFIRM_NOTE[mode]}</p>
      </ConfirmDialog>
    </form>
  );
}
