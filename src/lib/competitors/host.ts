/**
 * Competitors are stored as names, and a name is only sometimes a domain. We
 * ask Google for a favicon only when the name really looks like a host, so a
 * product called "Typeform" shows its initials instead of a wrong icon.
 */
const DOMAIN = /^(?:https?:\/\/)?(?:www\.)?((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})(?:[/?#].*)?$/;

export function competitorHost(name: string): string | null {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed || /\s/.test(trimmed)) {
    return null;
  }
  return DOMAIN.exec(trimmed)?.[1] ?? null;
}
