'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';

/** Asks for the studio's access code once; the server remembers it in a cookie. */
export function AccessForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch('/api/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (response.ok) router.refresh();
    else setError(((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Không vào được.');
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-3 rounded-xl border border-border bg-card p-5">
      <h1 className="flex items-center gap-2 text-lg font-bold">
        <KeyRound className="h-5 w-5 text-accent" aria-hidden="true" /> Mã truy cập
      </h1>
      <p className="text-sm text-muted">Trang này chỉ dành cho Studio. Nhập mã truy cập được cấp để xem hộp thư.</p>
      <input
        type="password"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        aria-label="Mã truy cập"
        required
        className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !code} className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        Vào hộp thư
      </button>
    </form>
  );
}
