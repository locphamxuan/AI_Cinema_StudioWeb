/**
 * The Studio Web page a notification points to (`/contracts`, `/projects/{id}`, `/projects/{id}/episodes/{id}`),
 * or null for anything that is not a path of this site: a notification never sends the studio elsewhere.
 */
export function portalPath(link: string | null | undefined): string | null {
  if (!link || !link.startsWith('/') || link.startsWith('//') || link.includes('\\')) return null;
  return link;
}
