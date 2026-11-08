import { apiRequest, type FetchLike } from './http';
import type {
  AuthSession,
  Contract,
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
  return {
    me: () => get<StudioProfile>('/studio-portal/me'),
    contracts: () => get<Contract[]>('/studio-portal/contracts'),
    proposeCost: (contractId: string, costVnd: number) =>
      post<Contract>(`/studio-portal/contracts/${id(contractId)}/propose`, { costVnd }),
    signContract: (contractId: string) => post<Contract>(`/studio-portal/contracts/${id(contractId)}/sign`),
    counterCost: (contractId: string, costVnd: number) =>
      post<Contract>(`/studio-portal/contracts/${id(contractId)}/counter`, { costVnd }),
    projects: () => get<ProjectSummary[]>('/studio-portal/projects'),
    project: (projectId: string) => get<ProjectDetail>(`/studio-portal/projects/${id(projectId)}`),
    submitLink: (episodeId: string, body: MediaLinkSubmission) =>
      post<unknown>(`/studio-portal/episodes/${id(episodeId)}/media`, body),
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
