import { cookies } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import { PortalHeader } from '@/components/PortalHeader';
import { SessionWatcher } from '@/components/SessionWatcher';
import { COOKIE } from '@/lib/session/tokens';
import { needsStudio } from '@/lib/domain/contract';
import { loadContracts, loadProfile, loadProjects, loadStudio, loadUnreadCount } from '@/lib/session/portal-data';

/** Every screen after login: the inset sidebar of the template, and the page on a raised card beside it. */
export default async function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [studio, contracts, projects, unread, profile] = await Promise.all([
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
    loadUnreadCount().catch((error: unknown) => {
      unstable_rethrow(error);
      return { unread: 0 };
    }),
    loadProfile().catch((error: unknown) => {
      unstable_rethrow(error);
      return null;
    }),
  ]);

  const accountId = (await cookies()).get(COOKIE.account)?.value ?? null;
  const studioName = studio?.name ?? 'Studio';
  const contactLabel = studio?.contactName ?? studio?.email ?? null;
  const waitingContracts = contracts.filter(needsStudio).length;
  const producingProjects = projects.filter((p) => p.status === 'IN_PRODUCTION').length;

  return (
    <div className="flex min-h-screen flex-col bg-surface text-foreground md:flex-row">
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
        unreadNotifications={unread.unread}
        missingProfileFields={profile?.missing.length ?? 0}
      />
      <div className="min-w-0 flex-1 p-2 md:pl-0">
        <main id="main" className="min-h-full w-full space-y-6 rounded-xl border border-border bg-background p-4 shadow-xs sm:p-6 lg:p-8">
          <SessionWatcher accountId={accountId} cookieName={COOKIE.account} />
          <div className="mx-auto max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
