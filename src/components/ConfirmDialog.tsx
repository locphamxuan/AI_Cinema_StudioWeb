'use client';

import { useEffect, useId, useRef } from 'react';
import { BUTTON, BUTTON_GHOST } from './ui';

/**
 * Asks the studio to confirm a move that cannot be taken back (signing, delivering, processing again), showing what
 * will be sent. A native modal <dialog>: the page behind is inert and focus stays inside until it closes, so nothing
 * can change between the check and the send. Escape, a click outside or "Quay lại" cancels; focus then returns to
 * the button that opened it.
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      confirmRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      openerRef.current?.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape: let React state close it, so `open` stays the single source of truth.
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md overscroll-contain rounded-3xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-slate-950/50"
    >
      {open && (
        <div className="space-y-4 p-6">
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
      )}
    </dialog>
  );
}
