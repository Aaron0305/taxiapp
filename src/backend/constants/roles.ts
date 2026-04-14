export const ROLES = {
  PASAJERO: 'pasajero',
  CONDUCTOR: 'conductor',
  ADMIN: 'admin',
} as const;

export type RolKey = keyof typeof ROLES;
export type RolValue = (typeof ROLES)[RolKey];
