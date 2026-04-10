const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5135').replace(/\/$/, '');

function extractErrorMessage(errorPayload: unknown, fallback: string): string {
  if (!errorPayload || typeof errorPayload !== 'object') {
    return fallback;
  }

  const payload = errorPayload as {
    message?: unknown;
    errors?: unknown;
    title?: unknown;
  };

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }

  if (Array.isArray(payload.errors)) {
    const messages = payload.errors.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    if (messages.length > 0) {
      return messages.join(' ');
    }
  }

  if (payload.errors && typeof payload.errors === 'object') {
    const values = Object.values(payload.errors)
      .flatMap((v) => (Array.isArray(v) ? v : []))
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

    if (values.length > 0) {
      return values.join(' ');
    }
  }

  if (typeof payload.title === 'string' && payload.title.trim()) {
    return payload.title;
  }

  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('nd_token');
  const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  const isAuthEndpoint =
    path.startsWith('/api/auth/login')
    || path.startsWith('/api/auth/register')
    || path.startsWith('/api/auth/mfa');

  if (response.status === 401) {
    localStorage.removeItem('nd_token');

    if (!isAuthEndpoint) {
      window.location.href = '/login';
    }

    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, 'Unauthorized'));
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, `HTTP ${response.status}`));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const token = localStorage.getItem('nd_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, `HTTP ${response.status}`));
  }

  return response.blob();
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, options),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  getBlob: (path: string, options?: RequestInit) => requestBlob(path, options),
};
