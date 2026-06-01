import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { firstValueFrom, type Observable } from 'rxjs';

/**
 * BaseApiClient — thin convenience wrapper around `HttpClient` that
 * - resolves the base URL once
 * - converts observables to promises at the call site (matches the
 *   async/await style used by SignalStore `rxMethod` patterns)
 * - keeps subclasses free of boilerplate
 */
export abstract class BaseApiClient {
  protected readonly http = inject(HttpClient);

  constructor(protected readonly baseUrl: string) {}

  protected get<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${this.baseUrl}${path}`));
  }

  protected post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${this.baseUrl}${path}`, body));
  }

  protected put<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(`${this.baseUrl}${path}`, body));
  }

  protected patch<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.patch<T>(`${this.baseUrl}${path}`, body));
  }

  protected delete<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.delete<T>(`${this.baseUrl}${path}`));
  }

  protected stream<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`);
  }
}
