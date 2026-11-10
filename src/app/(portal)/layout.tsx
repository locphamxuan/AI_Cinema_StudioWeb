import { unstable_rethrow } from 'next/navigation';
import { PortalHeader } from '@/components/PortalHeader';
import { needsStudio } from '@/lib/domain/contract';
import { pagePortal } from '@/lib/session/server';

/** Every screen after login: fixed left Contra sidebar, studio profile and page content. */
export default async function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const api = await pagePortal();
  const [studio, contracts, projects, notifications] = await Promise.all([
    api.me().catch((error: unknown) => {
      unstable_rethrow(error);
      return null;
    }),
    api.contracts().catch((error: unknown) => {
      unstable_rethrow(error);
      return [];
    }),
    api.projects().catch((error: unknown) => {
      unstable_rethrow(error);
      return [];
    }),
    api.notifications(20).catch((error: unknown) => {
      unstable_rethrow(error);
      return { data: [] };
    }),
  ]);

  const studioName = studio?.name ?? 'Studio';
  const contactLabel = studio?.contactName ?? studio?.email ?? null;
  const waitingContracts = contracts.filter(needsStudio).length;
  const producingProjects = projects.filter((p) => p.status === 'IN_PRODUCTION').length;
  const unreadNotifications = notifications.data.filter((n) => !n.readAt).length;

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB] text-slate-900 dark:bg-[#090B10] dark:text-slate-100 md:flex-row">
      <PortalHeader
        studioName={studioName}
        contactLabel={contactLabel}
        waitingContracts={waitingContracts}
        producingProjects={producingProjects}
        unreadNotifications={unreadNotifications}
      />
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
