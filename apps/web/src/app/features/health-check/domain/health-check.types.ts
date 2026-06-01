export interface HealthStatus {
  readonly status: 'ok' | 'degraded' | 'down';
  readonly version: string;
  readonly timestamp: string;
}
