export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  displayName: string;
  role: string;
  requiresMfa: boolean;
}

export interface User {
  email: string;
  displayName: string;
  role: string;
  has2fa: boolean;
}
