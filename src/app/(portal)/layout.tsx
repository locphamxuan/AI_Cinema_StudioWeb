import { unstable_rethrow } from 'next/navigation';
import { PortalHeader } from '@/components/PortalHeader';
import { pagePortal } from '@/lib/session/server';

/** Every screen after login: the studio's name, the three places it works in, and logout. */
export default async function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const api = await pagePortal();
  const studioName = await api.me().then(
    (studio) => studio.name,
    (error: unknown) => {
      unstable_rethrow(error);
      return 'Studio';
    },
  );
  return (
    <>
      <PortalHeader studioName={studioName} />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">{children}</main>
    </>
  );
}
