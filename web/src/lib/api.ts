// src/lib/api.ts
// Backend API istemcisi — Bearer token ile.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

const TOKEN_KEY = "lo_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // 401 → oturum bitti
    if (res.status === 401 && typeof window !== "undefined") {
      clearToken();
    }
    const message =
      (data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : null) ?? `Hata (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}
