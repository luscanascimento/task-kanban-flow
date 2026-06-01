export type UserRole = 'admin' | 'manager' | 'member' | 'viewer';

export interface UserDto {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly role: UserRole;
  readonly createdAt: string;
  readonly updatedAt: string;
}
