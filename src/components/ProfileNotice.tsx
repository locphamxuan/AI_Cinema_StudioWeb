import Link from 'next/link';
import { LEGAL_FIELD_LABEL } from '@/lib/domain/legal-profile';
import type { LegalProfileField } from '@/lib/api/types';

/** Shown instead of a way to sign while Bên B is incomplete: what is missing, and where to fill it in. */
export function ProfileNotice({ missing }: { missing: LegalProfileField[] }) {
  const onlyAdmin = missing.every((field) => field === 'contactName');
  return (
    <div role="alert" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      <p className="font-semibold">Chưa ký được: hồ sơ pháp lý của Studio còn thiếu.</p>
      <p>Còn thiếu: {missing.map((field) => LEGAL_FIELD_LABEL[field]).join(', ')}.</p>
      {onlyAdmin ? (
        <p>Người đại diện do Admin AI Cinema nhập. Vui lòng liên hệ Admin để bổ sung.</p>
      ) : (
        <Link href="/profile" className="inline-flex font-semibold underline underline-offset-2">
          Hoàn thiện hồ sơ pháp lý
        </Link>
      )}
    </div>
  );
}
