// mobile-app/src/config/api.ts

// Export the base URL for API calls. Uses the Expo public env var or falls back to localhost.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export default API_BASE_URL;

// Helper functions for common HTTP verbs. They throw on non‑2xx responses.
export const apiGet = async (path: string) => {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed with status ${res.status}`);
  return res.json();
};

export const apiPost = async (path: string, body: any) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed with status ${res.status}`);
  return res.json();
};

export const apiPut = async (path: string, body: any) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed with status ${res.status}`);
  return res.json();
};

export const apiDelete = async (path: string) => {
  const res = await fetch(`${API_BASE_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed with status ${res.status}`);
  return res.json();
};
