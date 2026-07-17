/**
 * Thin REST client for the Task Kanban Flow API. Every call carries the API key
 * as a Bearer token; the server enforces the key's scope (read vs read_write).
 */
export interface TkfClientOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
}

export interface ApiFailure {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
}

export class TkfApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'TkfApiError';
  }
}

export class TkfClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: TkfClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const failure = (data ?? {}) as Partial<ApiFailure>;
      throw new TkfApiError(res.status, failure.code ?? 'error', failure.message ?? res.statusText);
    }
    return data as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body ?? {});
  }
  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }
  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}
