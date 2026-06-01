export interface ApiErrorDto {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
  readonly details?: ReadonlyArray<ApiErrorDetail>;
  readonly timestamp: string;
  readonly path?: string;
}

export interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
  readonly code?: string;
}
