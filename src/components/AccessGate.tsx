import { visitorHasAccess } from '@/lib/session';
import { AccessForm } from './AccessForm';

/** Shows its children only to a visitor who knows the access code (when the studio set one). */
export async function AccessGate({ children }: { children: React.ReactNode }) {
  if (!(await visitorHasAccess())) return <AccessForm />;
  return <>{children}</>;
}
