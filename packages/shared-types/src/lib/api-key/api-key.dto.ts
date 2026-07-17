/**
 * A personal API key used to authenticate against the public REST API and the
 * MCP server. The plaintext key is shown only once (on creation); afterwards
 * only its non-secret metadata is available. A key is valid until it is revoked
 * (soft delete).
 */
export type ApiKeyScope = 'read' | 'read_write';

export interface ApiKeyDto {
  readonly id: string;
  readonly name: string;
  /** Short non-secret prefix for display, e.g. `tkf_9f3ab21c`. */
  readonly display: string;
  readonly scope: ApiKeyScope;
  readonly createdAt: string;
  readonly lastUsedAt?: string;
  /** True once the key has been revoked (its `deleted_at` is set). */
  readonly revoked: boolean;
}

export interface CreateApiKeyRequestDto {
  readonly name: string;
  readonly scope: ApiKeyScope;
}

/** Returned only from key creation — includes the plaintext key ONCE. */
export interface CreatedApiKeyDto extends ApiKeyDto {
  readonly key: string;
}
