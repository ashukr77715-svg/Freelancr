export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  // De-duplicate concurrent refresh attempts.
  refreshPromise ??= fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

async function rawRequest(path: string, options: RequestOptions): Promise<Response> {
  return fetch(path, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : {},
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
}

/**
 * JSON API client. On a 401 it attempts one token refresh and retries the
 * original request; if that fails the caller receives the 401.
 */
export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  let res = await rawRequest(path, options);

  if (res.status === 401 && !path.startsWith("/api/auth/refresh")) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawRequest(path, options);
    }
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      (data as { error?: string })?.error ?? "Request failed",
      (data as { code?: string })?.code
    );
  }

  return data as T;
}
