// src/lib/api.ts
// Backend API istemcisi — Bearer token ile.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

const TOKEN_KEY = "lo_token";
const ADMIN_TOKEN_KEY = "lo_admin_token";

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

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}
export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}
export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
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
  admin?: boolean;
};

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, auth = true, admin = false } = opts;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = admin ? getAdminToken() : getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  // Sayfalama normalize: Laravel düz paginate() üst seviyede meta döndürür;
  // Resource::collection ise {data, meta}. İkisini de meta'ya çeviriyoruz.
  if (
    res.ok && data && typeof data === "object" &&
    Array.isArray((data as Record<string, unknown>).data) &&
    (data as Record<string, unknown>).meta === undefined &&
    (data as Record<string, unknown>).current_page !== undefined
  ) {
    const d = data as Record<string, unknown>;
    d.meta = { current_page: d.current_page, last_page: d.last_page, total: d.total, per_page: d.per_page };
  }

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
