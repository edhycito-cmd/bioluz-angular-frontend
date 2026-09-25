export interface User {
  id: string;
  email: string;
  name: string;
}

/** Coincide con toPublicObject() del backend (GET /users/me) */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
