export interface LoginRequestDto {
  readonly email: string;
  readonly password: string;
}

export interface RegisterRequestDto {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
}

export interface RefreshTokenRequestDto {
  readonly refreshToken: string;
}
