import { useAuthStore } from '../store/authStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {}

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string };

type RequestOptions = {
  token?: string | null;
  body?: unknown;
};

function requireBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new ApiError(
      'EXPO_PUBLIC_API_URL belum diset. Lihat backend/server/DEPLOY.md untuk cara deploy backend.'
    );
  }
  return API_BASE_URL;
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  let json: ApiEnvelope<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(`Server memberi respons tidak valid (HTTP ${res.status}).`);
  }
  if (!json.ok) throw new ApiError(json.error);
  return json.data;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  { token, body }: RequestOptions = {}
): Promise<T> {
  const baseUrl = requireBaseUrl();

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let requestBody: string | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl}${path}`, { method, headers, body: requestBody });

  // A 401 on a request that carried a token means the session itself was rejected
  // (expired/invalid JWT, or the account got locked/disabled) — not a login-form
  // wrong-PIN response, since those requests don't carry a token. Log out so
  // RootNavigator's isAuthenticated check redirects to the login screen instead of
  // leaving the user stuck on a screen that will fail forever.
  if (res.status === 401 && token) {
    useAuthStore.getState().logout();
  }

  return parseEnvelope<T>(res);
}

export function buildFileUrl(fileId: string): string {
  return `${requireBaseUrl()}/files/${fileId}`;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>('GET', path, { token }),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>('POST', path, { token, body }),
  patch: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>('PATCH', path, { token, body }),
  delete: <T>(path: string, token?: string | null) => request<T>('DELETE', path, { token }),
};

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

export function guessMimeType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

export type UploadResult = { fileId: string; name: string };

/**
 * Uploads a locally-picked file to the backend's file store. Uses FormData
 * and deliberately does NOT set Content-Type — fetch must set its own
 * multipart boundary, which a manual header would break.
 */
export async function uploadFile(
  file: { uri: string; name: string },
  category: string,
  token: string | null,
  participantId?: string
): Promise<UploadResult> {
  const baseUrl = requireBaseUrl();

  const formData = new FormData();
  formData.append('category', category);
  if (participantId) formData.append('participantId', participantId);
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: guessMimeType(file.name),
  } as unknown as Blob);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}/files`, { method: 'POST', headers, body: formData });

  if (res.status === 401 && token) {
    useAuthStore.getState().logout();
  }

  return parseEnvelope<UploadResult>(res);
}

export type PinResetSelfies = {
  front: { uri: string; name: string };
  left: { uri: string; name: string };
  right: { uri: string; name: string };
};

/** Pre-login "lupa PIN" submission — no token, participant identified by email/NIM. */
export async function submitPinResetRequest(
  identifier: string,
  selfies: PinResetSelfies
): Promise<{ id: string }> {
  const baseUrl = requireBaseUrl();

  const formData = new FormData();
  formData.append('identifier', identifier);
  (['front', 'left', 'right'] as const).forEach((key) => {
    const file = selfies[key];
    formData.append(key, {
      uri: file.uri,
      name: file.name,
      type: guessMimeType(file.name),
    } as unknown as Blob);
  });

  const res = await fetch(`${baseUrl}/pin-reset`, { method: 'POST', body: formData });
  return parseEnvelope<{ id: string }>(res);
}
