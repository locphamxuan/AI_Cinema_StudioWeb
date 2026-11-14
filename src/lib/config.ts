/** Settings read from the environment, on the server only. Read on every call so tests can change them. */

export interface OAuthSettings {
  /** The client registered in AI Cinema's `oauth_clients` (seeded from OAUTH_STUDIO_WEB_CLIENT_ID). */
  clientId: string;
  /** Empty for a public client: PKCE alone then protects the code. */
  clientSecret?: string;
  /** The consent screen of AI_Cinema_FE, where the studio logs in with its AI Cinema account. */
  authorizeUrl: string;
  /** This site's callback; must be registered literally in OAUTH_STUDIO_WEB_REDIRECT_URIS of the API. */
  redirectUri: string;
  scope: string;
}

export interface StudioWebConfig {
  /** Base URL of the AI Cinema API, without a trailing slash, e.g. http://localhost:3001/api */
  apiUrl: string;
  /** Session cookies are sent over https only. */
  secureCookies: boolean;
  oauth: OAuthSettings;
  /** The email + password form next to the OAuth button: for local work and tests, off in production. */
  passwordLogin: boolean;
}

type Env = Record<string, string | undefined>;

const DEFAULT_API_URL = 'http://localhost:3001/api';
const DEFAULT_WEB_URL = 'http://localhost:3000';
const DEFAULT_STUDIO_WEB_URL = 'http://localhost:3100';
export const STUDIO_PORTAL_SCOPE = 'studio:portal';

const trimUrl = (value: string | undefined, fallback: string) => (value?.trim() || fallback).replace(/\/+$/, '');
const flag = (value: string | undefined, fallback: boolean) => (value?.trim() ? value.trim() === 'true' : fallback);

export function getConfig(env: Env = process.env): StudioWebConfig {
  const production = env.NODE_ENV === 'production';
  const webUrl = trimUrl(env.AI_CINEMA_WEB_URL, DEFAULT_WEB_URL);
  const siteUrl = trimUrl(env.STUDIO_WEB_URL, DEFAULT_STUDIO_WEB_URL);
  return {
    apiUrl: trimUrl(env.AI_CINEMA_API_URL, DEFAULT_API_URL),
    secureCookies: flag(env.COOKIE_SECURE, production),
    oauth: {
      clientId: env.OAUTH_CLIENT_ID?.trim() || 'studio-web',
      clientSecret: env.OAUTH_CLIENT_SECRET?.trim() || undefined,
      authorizeUrl: `${webUrl}/oauth/authorize`,
      redirectUri: `${siteUrl}/api/auth/callback`,
      scope: STUDIO_PORTAL_SCOPE,
    },
    passwordLogin: flag(env.STUDIO_PASSWORD_LOGIN, !production),
  };
}
