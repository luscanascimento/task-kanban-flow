/**
 * A stored credential / account used within a specific board (project).
 * Captures the platform, the kind of authentication, and the secret itself.
 *
 * ⚠ SECURITY: in this portfolio build secrets are stored as plaintext in the
 * mock backend. A production implementation must encrypt at rest (e.g. a
 * managed KMS/vault), gate reads behind team-admin authorization, and never
 * return the secret value in list endpoints. The DTO shape is deliberately
 * vault-ready so that seam can change without touching the UI.
 */
export type SecretAuthType =
  | 'password'
  | 'api_key'
  | 'oauth'
  | 'access_token'
  | 'ssh_key'
  | 'other';

export interface ProjectSecretDto {
  readonly id: string;
  readonly boardId: string;
  /** Optional link to the client this account belongs to. */
  readonly clientId?: string;
  /** e.g. "AWS", "Google Ads", "Meta Business", "Cloudflare". */
  readonly platform: string;
  /** Human label for the account, e.g. "Production root", "Ads manager". */
  readonly label: string;
  readonly authType: SecretAuthType;
  /** Login / username / key id, when applicable. */
  readonly username?: string;
  /** The credential value (password, API key, token, private key…). */
  readonly secret: string;
  readonly url?: string;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateProjectSecretRequestDto {
  readonly boardId: string;
  readonly clientId?: string;
  readonly platform: string;
  readonly label: string;
  readonly authType: SecretAuthType;
  readonly username?: string;
  readonly secret: string;
  readonly url?: string;
  readonly notes?: string;
}

export interface UpdateProjectSecretRequestDto {
  readonly clientId?: string | null;
  readonly platform?: string;
  readonly label?: string;
  readonly authType?: SecretAuthType;
  readonly username?: string;
  readonly secret?: string;
  readonly url?: string;
  readonly notes?: string;
}
