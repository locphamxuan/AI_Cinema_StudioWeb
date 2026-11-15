import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const jar = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));

import { GET as callback } from '@/app/api/auth/callback/route';
import { GET as startLogin } from '@/app/api/auth/login/route';
import { GET as downloadDocument } from '@/app/api/contracts/[contractId]/documents/[side]/route';
import { getConfig } from '@/lib/config';
import { authorizeUrl, challengeOf, newVerifier, OAUTH_COOKIE, readPending } from '@/lib/session/pkce';
import { refreshSession } from '@/lib/session/tokens';

const token = { access_token: 'oa-access', token_type: 'Bearer', expires_in: 900, refresh_token: 'oa-refresh', scope: 'studio:portal' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const request = (url: string, cookie?: string) => new NextRequest(url, { headers: cookie ? { cookie } : {} });
const cookieOf = (pending: { state: string; verifier: string }) =>
  `${OAUTH_COOKIE}=${encodeURIComponent(JSON.stringify(pending))}`;

beforeEach(() => jar.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('PKCE and the consent URL', () => {
  it('derives the S256 challenge from a 43-character verifier', () => {
    const verifier = newVerifier();
    expect(verifier).toHaveLength(43);
    expect(challengeOf(verifier)).toBe(createHash('sha256').update(verifier).digest('base64url'));
  });

  it('points at the consent screen of AI_Cinema_FE with every RFC 6749 parameter', () => {
    const url = new URL(authorizeUrl(getConfig({}).oauth, { state: 's1', verifier: 'v'.repeat(43) }));
    expect(`${url.origin}${url.pathname}`).toBe('http://localhost:3000/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'studio-web',
      redirect_uri: 'http://localhost:3100/api/auth/callback',
      scope: 'studio:portal',
      state: 's1',
      code_challenge: challengeOf('v'.repeat(43)),
      code_challenge_method: 'S256',
    });
  });

  it('turns the password form off in production unless asked for', () => {
    expect(getConfig({ NODE_ENV: 'production' }).passwordLogin).toBe(false);
    expect(getConfig({ NODE_ENV: 'production', STUDIO_PASSWORD_LOGIN: 'true' }).passwordLogin).toBe(true);
    expect(getConfig({ NODE_ENV: 'development' }).passwordLogin).toBe(true);
  });

  it('reads back only a well-formed pending login', () => {
    expect(readPending('{"state":"a","verifier":"b"}')).toEqual({ state: 'a', verifier: 'b' });
    expect(readPending('nope')).toBeNull();
    expect(readPending(undefined)).toBeNull();
  });
});

describe('GET /api/auth/login', () => {
  it('redirects to the consent screen and keeps state + verifier in an httpOnly cookie', () => {
    const response = startLogin();
    const location = new URL(response.headers.get('location')!);
    const pending = readPending(response.cookies.get(OAUTH_COOKIE)?.value);
    expect(location.pathname).toBe('/oauth/authorize');
    expect(location.searchParams.get('state')).toBe(pending?.state);
    expect(location.searchParams.get('code_challenge')).toBe(challengeOf(pending!.verifier));
  });
});

describe('GET /api/auth/callback', () => {
  const pending = { state: 'st4te', verifier: 'v'.repeat(43) };

  it('swaps the code and verifier for tokens and opens an OAuth session', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => json(token));
    vi.stubGlobal('fetch', fetchMock);
    const response = await callback(request('http://localhost:3100/api/auth/callback?code=c0de&state=st4te', cookieOf(pending)));
    expect(new URL(response.headers.get('location')!).pathname).toBe('/');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/oauth/token');
    expect(Object.fromEntries(new URLSearchParams(String(init?.body)))).toEqual({
      grant_type: 'authorization_code',
      code: 'c0de',
      redirect_uri: 'http://localhost:3100/api/auth/callback',
      code_verifier: pending.verifier,
      client_id: 'studio-web',
    });
    expect(response.cookies.get('sw_access')?.value).toBe('oa-access');
    expect(response.cookies.get('sw_kind')?.value).toBe('oauth');
  });

  it('refuses a callback whose state does not match (CSRF)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await callback(request('http://localhost:3100/api/auth/callback?code=c&state=other', cookieOf(pending)));
    expect(response.headers.get('location')).toContain('/login?error=state');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a studio that denied the consent back to the login page', async () => {
    const response = await callback(request('http://localhost:3100/api/auth/callback?error=access_denied&state=st4te', cookieOf(pending)));
    expect(response.headers.get('location')).toContain('/login?error=denied');
  });

  it('reports a code the API refuses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'invalid_grant' }, 400)));
    const response = await callback(request('http://localhost:3100/api/auth/callback?code=c&state=st4te', cookieOf(pending)));
    expect(response.headers.get('location')).toContain('/login?error=oauth');
  });
});

describe('refreshSession of an OAuth session', () => {
  it('refreshes at /oauth/token with the client id', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => json(token));
    vi.stubGlobal('fetch', fetchMock);
    const session = await refreshSession('http://api.test/api', 'oauth-refresh-1', 'oauth');
    expect(session).toEqual({ accessToken: 'oa-access', accessTokenExpiresIn: 900, refreshToken: 'oa-refresh' });
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/oauth/token');
    expect(String(fetchMock.mock.calls[0][1]?.body)).toContain('grant_type=refresh_token');
  });
});

describe('GET /api/contracts/:id/documents/:side', () => {
  const CONTRACT = '7f1c8a2e-5b4d-4c3a-9e2f-1a2b3c4d5e6f';
  const call = (side: string, id = CONTRACT) =>
    downloadDocument(request(`http://localhost:3100/api/contracts/${id}/documents/${side}`), {
      params: Promise.resolve({ contractId: id, side }),
    });

  it('streams the PDF from the API with the studio token', async () => {
    jar.set('sw_access', 'acc');
    jar.set('sw_expires', String(Date.now() + 600_000));
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () =>
        new Response('%PDF-1.4', {
          headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="final.pdf"' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const response = await call('FINAL');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toContain('final.pdf');
    expect(await response.text()).toBe('%PDF-1.4');
    expect(fetchMock.mock.calls[0][0]).toBe(`http://localhost:3001/api/studio-portal/contracts/${CONTRACT}/documents/FINAL/content`);
    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer acc');
  });

  it('refuses a bad side or id, and a visitor without a session', async () => {
    expect((await call('OTHER')).status).toBe(400);
    expect((await call('FINAL', 'nope')).status).toBe(400);
    expect((await call('FINAL')).status).toBe(401);
  });
});
