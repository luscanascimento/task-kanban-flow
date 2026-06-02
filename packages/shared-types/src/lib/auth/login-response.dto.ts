import type { UserDto } from './user.dto';

export interface AuthTokensDto {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshTokenExpiresAt: string;
}

export interface LoginResponseDto {
  readonly user: UserDto;
  readonly tokens: AuthTokensDto;
}

/** Registration returns the same shape as login (user + tokens for auto-login). */
export type RegisterResponseDto = LoginResponseDto;
