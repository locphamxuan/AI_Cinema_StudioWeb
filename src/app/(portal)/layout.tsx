import { unstable_rethrow } from 'next/navigation';
import { PortalHeader } from '@/components/PortalHeader';
import { needsStudio } from '@/lib/domain/contract';
import { loadContracts, loadNotifications, loadProjects, loadStudio } from '@/lib/session/portal-data';

/** Every screen after login: fixed left Contra sidebar, studio profile and page content. */
export default async function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [studio, contracts, projects, notifications] = await Promise.all([
    loadStudio().catch((error: unknown) => {
      unstable_rethrow(error);
      return null;
    }),
    loadContracts().catch((error: unknown) => {
      unstable_rethrow(error);
      return [];
    }),
    loadProjects().catch((error: unknown) => {
      unstable_rethrow(error);
      return [];
    }),
    loadNotifications().catch((error: unknown) => {
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
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Bỏ qua tới nội dung chính
      </a>
      <PortalHeader
        studioName={studioName}
        contactLabel={contactLabel}
        waitingContracts={waitingContracts}
        producingProjects={producingProjects}
        unreadNotifications={unreadNotifications}
      />
      <main id="main" className="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
