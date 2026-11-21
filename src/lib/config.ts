/** Settings read from the environment, on the server only. Read on every call so tests can change them. */

export interface StudioWebConfig {
  /** Base URL of the AI Cinema API, without a trailing slash, e.g. http://localhost:3001/api */
  apiUrl: string;
  /** Session cookies are sent over https only. */
  secureCookies: boolean;
}

type Env = Record<string, string | undefined>;

const DEFAULT_API_URL = 'http://localhost:3001/api';

const trimUrl = (value: string | undefined, fallback: string) => (value?.trim() || fallback).replace(/\/+$/, '');
const flag = (value: string | undefined, fallback: boolean) => (value?.trim() ? value.trim() === 'true' : fallback);

export function getConfig(env: Env = process.env): StudioWebConfig {
  return {
    apiUrl: trimUrl(env.AI_CINEMA_API_URL, DEFAULT_API_URL),
    secureCookies: flag(env.COOKIE_SECURE, env.NODE_ENV === 'production'),
  };
}
