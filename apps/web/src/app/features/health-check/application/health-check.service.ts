import { Injectable, type Signal, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import type { HealthStatus } from '../domain/health-check.types';

@Injectable({ providedIn: 'root' })
export class HealthCheckService {
  private readonly http = inject(HttpClient);
  private readonly _status = signal<HealthStatus | null>(null);
  readonly status: Signal<HealthStatus | null> = this._status.asReadonly();
  readonly isHealthy: Signal<boolean> = computed(() => this._status()?.status === 'ok');

  async check(): Promise<HealthStatus> {
    const result = await firstValueFrom(
      this.http.get<HealthStatus>(`${environment.apiBaseUrl}/health`),
    );
    this._status.set(result);
    return result;
  }
}
