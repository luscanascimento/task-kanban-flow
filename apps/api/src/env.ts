import { randomBytes } from 'node:crypto';

/**
 * Environment configuration, validated at boot.
 *
 * Security posture: every secret is REQUIRED in production — the process
 * refuses to start without them. In development we generate strong ephemeral
 * values so the service runs out-of-the-box, but we log a loud warning so no
 * one mistakes an ephemeral dev secret for a configured one.
 */
export interface Env {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly isProd: boolean;
  readonly port: number;
  readonly host: string;
  readonly webOrigins: readonly string[];

  readonly jwtAccessSecret: string;
  readonly jwtRefreshSecret: string;
  readonly passwordPepper: string;
  readonly apiKeyPepper: string;
  /** 32 bytes for AES-256-GCM. */
  readonly secretsEncKey: Buffer;

  readonly accessTokenTtl: number;
  readonly refreshTokenTtl: number;
  readonly cookieSecure: boolean;

  readonly rateLimitMax: number;
  readonly rateLimitWindow: number;
  readonly authRateLimitMax: number;

  readonly databasePath: string;
}

function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  return value === 'true' || value === '1';
}

/** Decode a 32-byte key from base64 or hex, or throw if malformed. */
function decodeKey(value: string, name: string): Buffer {
  const buf = /^[0-9a-fA-F]{64}$/.test(value)
    ? Buffer.from(value, 'hex')
    : Buffer.from(value, 'base64');
  if (buf.length !== 32) {
    throw new Error(`${name} must decode to exactly 32 bytes (got ${buf.length}).`);
  }
  return buf;
}

function requireSecret(
  name: string,
  raw: string | undefined,
  isProd: boolean,
  warnings: string[],
): string {
  if (raw && raw.trim() !== '') {
    return raw;
  }
  if (isProd) {
    throw new Error(`Missing required environment secret: ${name}`);
  }
  warnings.push(name);
  return randomBytes(48).toString('base64');
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const nodeEnv = (source['NODE_ENV'] ?? 'development') as Env['nodeEnv'];
  const isProd = nodeEnv === 'production';
  const warnings: string[] = [];

  const jwtAccessSecret = requireSecret(
    'JWT_ACCESS_SECRET',
    source['JWT_ACCESS_SECRET'],
    isProd,
    warnings,
  );
  const jwtRefreshSecret = requireSecret(
    'JWT_REFRESH_SECRET',
    source['JWT_REFRESH_SECRET'],
    isProd,
    warnings,
  );
  const passwordPepper = requireSecret(
    'PASSWORD_PEPPER',
    source['PASSWORD_PEPPER'],
    isProd,
    warnings,
  );
  const apiKeyPepper = requireSecret('APIKEY_PEPPER', source['APIKEY_PEPPER'], isProd, warnings);

  let secretsEncKey: Buffer;
  const rawEncKey = source['SECRETS_ENC_KEY'];
  if (rawEncKey && rawEncKey.trim() !== '') {
    secretsEncKey = decodeKey(rawEncKey, 'SECRETS_ENC_KEY');
  } else if (isProd) {
    throw new Error('Missing required environment secret: SECRETS_ENC_KEY');
  } else {
    warnings.push('SECRETS_ENC_KEY');
    secretsEncKey = randomBytes(32);
  }

  if (warnings.length > 0) {
    console.warn(
      `[env] Using EPHEMERAL dev secrets for: ${warnings.join(', ')}. ` +
        `Data encrypted/hashed with these will not survive a restart. ` +
        `Set real values (see .env.example) before any non-dev use.`,
    );
  }

  const webOrigins = (source['WEB_ORIGIN'] ?? 'http://localhost:4200')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  return {
    nodeEnv,
    isProd,
    port: num(source['PORT'], 3000),
    host: source['HOST'] ?? '0.0.0.0',
    webOrigins,
    jwtAccessSecret,
    jwtRefreshSecret,
    passwordPepper,
    apiKeyPepper,
    secretsEncKey,
    accessTokenTtl: num(source['ACCESS_TOKEN_TTL'], 900),
    refreshTokenTtl: num(source['REFRESH_TOKEN_TTL'], 1_209_600),
    cookieSecure: bool(source['COOKIE_SECURE'], isProd),
    rateLimitMax: num(source['RATE_LIMIT_MAX'], 300),
    rateLimitWindow: num(source['RATE_LIMIT_WINDOW'], 60_000),
    authRateLimitMax: num(source['AUTH_RATE_LIMIT_MAX'], 10),
    databasePath: source['DATABASE_PATH'] ?? './data/tkf.db',
  };
}
