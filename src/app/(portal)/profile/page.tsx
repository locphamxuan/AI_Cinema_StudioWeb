import { ProfileForm } from '@/components/ProfileForm';
import { Badge, CARD, Facts, Guarded, PageTitle } from '@/components/ui';
import { LEGAL_FIELD_LABEL } from '@/lib/domain/legal-profile';
import { loadProfile } from '@/lib/session/portal-data';

export const metadata = { title: 'Hồ sơ pháp lý - Studio Web' };

async function Profile() {
  const profile = await loadProfile();
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
      <section className={`${CARD} space-y-4 p-5`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Admin AI Cinema nhập</h2>
          {profile.complete ? <Badge tone="done">Đủ để ký</Badge> : <Badge tone="action">Còn thiếu</Badge>}
        </div>
        <Facts
          items={[
            ['Tên Studio', profile.name],
            ['Email nhận hợp đồng', profile.email ?? '-'],
            ['Người đại diện', profile.contactName ?? 'Chưa có'],
            ['Điện thoại', profile.phone ?? '-'],
          ]}
        />
        <p className="text-xs leading-relaxed text-muted">Muốn sửa, hãy liên hệ Admin AI Cinema.</p>
        {!profile.complete && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Còn thiếu: {profile.missing.map((field) => LEGAL_FIELD_LABEL[field]).join(', ')}.
          </p>
        )}
      </section>
      <section className={`${CARD} space-y-4 p-5`}>
        <h2 className="text-base font-semibold">Studio tự điền</h2>
        <ProfileForm profile={profile} />
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <>
      <PageTitle title="Hồ sơ pháp lý" description="Thông tin Studio (Bên B) in trên hợp đồng. Điền đủ thì mới ký được." />
      <Guarded load={() => Profile()} />
    </>
  );
}
