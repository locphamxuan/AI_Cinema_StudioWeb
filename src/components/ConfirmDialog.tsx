'use client';

import { useEffect, useId, useRef } from 'react';
import { BUTTON, BUTTON_GHOST } from './ui';

/**
 * Asks the studio to confirm a move that cannot be taken back (signing, delivering, processing again), showing what
 * will be sent. Escape or "Quay lại" closes it; focus starts on the confirm button.
 */
export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-slate-950/50 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-card p-6 text-foreground shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold tracking-tight text-balance">
          {title}
        </h2>
        <div className="space-y-2 text-sm">{children}</div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className={BUTTON_GHOST}>
            Quay lại
          </button>
          <button ref={confirmRef} type="button" onClick={onConfirm} className={BUTTON}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
