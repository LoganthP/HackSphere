const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; form?: FormData; signal?: AbortSignal };

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method: opts.method ?? (body ? "POST" : "GET"),
      headers,
      body,
      credentials: "include",
      signal: opts.signal,
    });
  } catch {
    throw new ApiError(0, "Can't reach the HackSphere server. Check that the API is running on port 4000.");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status}).`, data.fields);
  return data as T;
}

export const apiUrl = (path: string) => `${BASE}/api${path}`;
export const socketUrl = BASE || undefined;
