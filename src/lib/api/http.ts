/** A failed call to the AI Cinema API, carrying its `{ error: { code, message, details } }` body. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ApiRequest {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token?: string;
  /** Sent as JSON. */
  json?: unknown;
  fetchImpl?: FetchLike;
}

const STATUS_TEXT: Record<number, string> = {
  400: 'Dữ liệu gửi lên không hợp lệ',
  401: 'Phiên đăng nhập đã hết hạn hoặc thông tin đăng nhập sai',
  403: 'Tài khoản không có quyền thực hiện thao tác này',
  404: 'Không tìm thấy dữ liệu',
  409: 'Không thể thực hiện ở trạng thái hiện tại',
  413: 'Tệp quá lớn',
  415: 'Định dạng tệp không được hỗ trợ',
  429: 'Thao tác quá nhanh, vui lòng thử lại sau ít phút',
};

function detailsOf(details: unknown): string[] {
  if (Array.isArray(details)) return details.map(String);
  if (typeof details === 'string') return [details];
  if (details && typeof details === 'object') {
    return Object.entries(details).map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
  }
  return [];
}

type ErrorBody = { error?: { code?: string; message?: string; details?: unknown } } | null;

/** Builds the error of an API answer from its parsed body; a body that is not the API's shape still gives a readable error. */
export function apiErrorOf(status: number, body: unknown, fallbackMessage: string): ApiError {
  const error = (body as ErrorBody)?.error;
  return new ApiError(status, error?.code ?? `HTTP_${status}`, error?.message ?? fallbackMessage, detailsOf(error?.details));
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null);
  return apiErrorOf(response.status, body, response.statusText ?? 'Request failed');
}

/** Calls `{baseUrl}{path}` and returns its JSON (undefined for 204); throws ApiError on a non-2xx answer. */
export async function apiRequest<T>(baseUrl: string, path: string, request: ApiRequest = {}): Promise<T> {
  const { method = 'GET', token, json, fetchImpl = fetch } = request;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers,
      body: json === undefined ? undefined : JSON.stringify(json),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Không kết nối được tới máy chủ AI Cinema');
  }
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** A Vietnamese sentence for any error, keeping the API's own message and details so nothing is hidden. */
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
  if (error.status === 0) return error.message;
  const prefix = STATUS_TEXT[error.status] ?? `Lỗi máy chủ (${error.status})`;
  const parts = [error.message, ...error.details].filter((part) => part && part !== 'The request is invalid');
  return parts.length ? `${prefix}: ${parts.join('; ')}` : `${prefix}.`;
}
