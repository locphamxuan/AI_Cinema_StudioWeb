import { apiRequest, type FetchLike } from './http';
import type {
  AuthSession,
  OAuthTokenResponse,
  Contract,
  Delivery,
  MediaLinkSubmission,
  Paginated,
  PortalNotification,
  ProjectDetail,
  ProjectSummary,
  StudioProfile,
} from './types';

const id = (value: string) => encodeURIComponent(value);

/** The calls a logged-in studio makes; every one carries the access token of its session. */
export function portalApi(baseUrl: string, token: string, fetchImpl?: FetchLike) {
  const get = <T>(path: string) => apiRequest<T>(baseUrl, path, { token, fetchImpl });
  const post = <T>(path: string, json?: unknown) =>
    apiRequest<T>(baseUrl, path, { method: 'POST', token, json, fetchImpl });
  /** A signing move: the signed contract PDF in `file`, plus the cost when the studio names one. */
  const signed = <T>(path: string, file: Blob, costVnd?: number) => {
    const form = new FormData();
    form.append('file', file, file instanceof File && file.name ? file.name : 'hop-dong-da-ky.pdf');
    if (costVnd !== undefined) form.append('costVnd', String(costVnd));
    return apiRequest<T>(baseUrl, path, { method: 'POST', token, form, fetchImpl });
  };
  return {
    me: () => get<StudioProfile>('/studio-portal/me'),
    contracts: () => get<Contract[]>('/studio-portal/contracts'),
    proposeCost: (contractId: string, costVnd: number, file: Blob) =>
      signed<Contract>(`/studio-portal/contracts/${id(contractId)}/propose`, file, costVnd),
    signContract: (contractId: string, file: Blob) =>
      signed<Contract>(`/studio-portal/contracts/${id(contractId)}/sign`, file),
    counterCost: (contractId: string, costVnd: number, file: Blob) =>
      signed<Contract>(`/studio-portal/contracts/${id(contractId)}/counter`, file, costVnd),
    projects: () => get<ProjectSummary[]>('/studio-portal/projects'),
    project: (projectId: string) => get<ProjectDetail>(`/studio-portal/projects/${id(projectId)}`),
    submitLink: (episodeId: string, body: MediaLinkSubmission) =>
      post<unknown>(`/studio-portal/episodes/${id(episodeId)}/media`, body),
    retryDelivery: (mediaAssetId: string) => post<Delivery>(`/studio-portal/media-assets/${id(mediaAssetId)}/retry`),
    notifications: (limit = 20) => get<Paginated<PortalNotification>>(`/notifications?limit=${limit}&page=1`),
    markAllRead: () => apiRequest<{ updated: number }>(baseUrl, '/notifications/read-all', { method: 'PATCH', token, fetchImpl }),
  };
}

export type PortalApi = ReturnType<typeof portalApi>;

/** Account calls, made before (login) or around (refresh, logout) a session. */
export const authApi = (baseUrl: string, fetchImpl?: FetchLike) => ({
  login: (email: string, password: string) =>
    apiRequest<AuthSession>(baseUrl, '/auth/login', { method: 'POST', json: { email, password }, fetchImpl }),
  refresh: (refreshToken: string) =>
    apiRequest<AuthSession>(baseUrl, '/auth/refresh', { method: 'POST', json: { refreshToken }, fetchImpl }),
  logout: (refreshToken: string) =>
    apiRequest<void>(baseUrl, '/auth/logout', { method: 'POST', json: { refreshToken }, fetchImpl }),
});

export interface OAuthClientCredentials {
  clientId: string;
  clientSecret?: string;
}

const clientFields = ({ clientId, clientSecret }: OAuthClientCredentials): Record<string, string> =>
  clientSecret ? { client_id: clientId, client_secret: clientSecret } : { client_id: clientId };

/** Studio Web as an OAuth 2.0 client of AI Cinema (Authorization Code + PKCE), called from the server only. */
export const oauthApi = (baseUrl: string, client: OAuthClientCredentials, fetchImpl?: FetchLike) => ({
  exchangeCode: (code: string, redirectUri: string, codeVerifier: string) =>
    apiRequest<OAuthTokenResponse>(baseUrl, '/oauth/token', {
      method: 'POST',
      urlencoded: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        ...clientFields(client),
      },
      fetchImpl,
    }),
  refresh: (refreshToken: string) =>
    apiRequest<OAuthTokenResponse>(baseUrl, '/oauth/token', {
      method: 'POST',
      urlencoded: { grant_type: 'refresh_token', refresh_token: refreshToken, ...clientFields(client) },
      fetchImpl,
    }),
  revoke: (refreshToken: string) =>
    apiRequest<unknown>(baseUrl, '/oauth/revoke', {
      method: 'POST',
      urlencoded: { token: refreshToken, token_type_hint: 'refresh_token', ...clientFields(client) },
      fetchImpl,
    }),
});

/** The OAuth answer in the shape the session cookies are written from. */
export const sessionOfToken = (token: OAuthTokenResponse): AuthSession => ({
  accessToken: token.access_token,
  accessTokenExpiresIn: token.expires_in,
  refreshToken: token.refresh_token,
});
