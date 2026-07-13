/**
 * A client (external customer). Clients are global to the workspace and can
 * be assigned to boards and tasks so work can be attributed and filtered by
 * who it is for.
 */
export interface ClientDto {
  readonly id: string;
  readonly name: string;
  readonly company?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly notes?: string;
  /** Accent color used for the client chip/avatar. */
  readonly color?: string;
  /** Number of boards currently assigned to this client (server-computed). */
  readonly boardCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateClientRequestDto {
  readonly name: string;
  readonly company?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly notes?: string;
  readonly color?: string;
}

export interface UpdateClientRequestDto {
  readonly name?: string;
  readonly company?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly notes?: string;
  readonly color?: string;
}
