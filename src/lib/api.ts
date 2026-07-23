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

function guessMimeType(name: string): string {
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
  return parseEnvelope<UploadResult>(res);
}
