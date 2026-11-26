import { apiRequest, type FetchLike } from './http';
import type {
  AuthSession,
  Contract,
  Delivery,
  LegalProfileInput,
  MediaLinkSubmission,
  Paginated,
  PortalNotification,
  ProjectDetail,
  ProjectSummary,
  StudioLegalProfile,
  StudioProfile,
} from './types';

const id = (value: string) => encodeURIComponent(value);

/** The calls a logged-in studio makes; every one carries the access token of its session. */
export function portalApi(baseUrl: string, token: string, fetchImpl?: FetchLike) {
  const get = <T>(path: string) => apiRequest<T>(baseUrl, path, { token, fetchImpl });
  const post = <T>(path: string, json?: unknown) =>
    apiRequest<T>(baseUrl, path, { method: 'POST', token, json, fetchImpl });
  /** A signing move: the studio's signature image in `file`, plus the cost when the studio names one. */
  const signed = <T>(path: string, file: Blob, costVnd?: number) => {
    const form = new FormData();
    form.append('file', file, file instanceof File && file.name ? file.name : 'chu-ky.png');
    if (costVnd !== undefined) form.append('costVnd', String(costVnd));
    return apiRequest<T>(baseUrl, path, { method: 'POST', token, form, fetchImpl });
  };
  return {
    me: () => get<StudioProfile>('/studio-portal/me'),
    profile: () => get<StudioLegalProfile>('/studio-portal/profile'),
    updateProfile: (body: LegalProfileInput) =>
      apiRequest<StudioLegalProfile>(baseUrl, '/studio-portal/profile', { method: 'PUT', token, json: body, fetchImpl }),
    contracts: () => get<Contract[]>('/studio-portal/contracts'),
    /** Without a cost the studio signs at the budget ceiling printed on the contract. */
    proposeCost: (contractId: string, costVnd: number | undefined, file: Blob) =>
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
    notifications: (limit = 20, page = 1) => get<Paginated<PortalNotification>>(`/notifications?limit=${limit}&page=${page}`),
    unreadCount: () => get<{ unread: number }>('/notifications/unread-count'),
    markRead: (notificationId: string) =>
      apiRequest<void>(baseUrl, `/notifications/${id(notificationId)}/read`, { method: 'PATCH', token, fetchImpl }),
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
