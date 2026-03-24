const API_BASE = "";

export type PanelRole = "ADMINISTRATOR" | "MARKETING";

export class ApiError extends Error {
  status: number;
  code?: string;
  metaCode?: number;

  constructor(message: string, status: number, code?: string, metaCode?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.metaCode = metaCode;
  }

  get tokenExpired(): boolean {
    return this.code === "TOKEN_EXPIRED" || this.metaCode === 190;
  }
}

export function getToken(): string | null {
  return localStorage.getItem("sm_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("sm_token", token);
  else localStorage.removeItem("sm_token");
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    let msg = res.statusText;
    let code: string | undefined;
    let metaCode: number | undefined;
    try {
      const j = (await res.json()) as { error?: string; code?: string; metaCode?: number };
      if (j.error) msg = j.error;
      code = j.code;
      metaCode = j.metaCode;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status, code, metaCode);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
