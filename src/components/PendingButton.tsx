'use client';

import { useFormStatus } from 'react-dom';

/**
 * The submit button of a small server-action form (log out, mark notifications read, open a notification): it is
 * disabled and says so while its form is being sent, so a second click sends nothing.
 */
export function PendingButton({
  children,
  pendingLabel,
  className,
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled'> & { pendingLabel?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending || undefined} className={`${className ?? ''} disabled:cursor-wait disabled:opacity-60`} {...rest}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
