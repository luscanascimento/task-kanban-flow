import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

/**
 * Stateless JWT access tokens and refresh tokens (HS256).
 *
 * Access tokens are short-lived (minutes) and carry the user id. Refresh
 * tokens are long-lived, delivered in an httpOnly cookie, and rotated on use.
 * Access and refresh are signed with SEPARATE secrets so a leaked access
 * secret cannot mint refresh tokens.
 */
export interface AccessClaims {
  readonly sub: string;
  readonly email: string;
}

export interface RefreshClaims {
  readonly sub: string;
  /** Rotation id — lets us invalidate a specific refresh chain if needed. */
  readonly jti: string;
}

const ISSUER = 'tkf-api';
const AUDIENCE = 'tkf';

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  claims: AccessClaims,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  return new SignJWT({ email: claims.email })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key(secret));
}

export async function signRefreshToken(
  claims: RefreshClaims,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setJti(claims.jti)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key(secret));
}

async function verify(token: string, secret: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, key(secret), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return payload;
}

export async function verifyAccessToken(token: string, secret: string): Promise<AccessClaims> {
  const payload = await verify(token, secret);
  if (typeof payload.sub !== 'string' || typeof payload['email'] !== 'string') {
    throw new Error('Invalid access token claims');
  }
  return { sub: payload.sub, email: payload['email'] };
}

export async function verifyRefreshToken(token: string, secret: string): Promise<RefreshClaims> {
  const payload = await verify(token, secret);
  if (typeof payload.sub !== 'string' || typeof payload.jti !== 'string') {
    throw new Error('Invalid refresh token claims');
  }
  return { sub: payload.sub, jti: payload.jti };
}
