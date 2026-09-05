const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed with status ${res.status}`);
  }

  return data as T;
}
