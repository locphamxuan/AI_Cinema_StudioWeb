/** Settings read from the environment, on the server only. Read on every call so tests can change them. */

export interface StudioWebConfig {
  /** Base URL of the AI Cinema API, without a trailing slash, e.g. http://localhost:3001/api */
  apiUrl: string;
  /** Session cookies are sent over https only. */
  secureCookies: boolean;
}

type Env = Record<string, string | undefined>;

const DEFAULT_API_URL = 'http://localhost:3001/api';

export function getConfig(env: Env = process.env): StudioWebConfig {
  const apiUrl = (env.AI_CINEMA_API_URL?.trim() || DEFAULT_API_URL).replace(/\/+$/, '');
  const secureFlag = env.COOKIE_SECURE?.trim();
  return {
    apiUrl,
    secureCookies: secureFlag ? secureFlag === 'true' : env.NODE_ENV === 'production',
  };
}
