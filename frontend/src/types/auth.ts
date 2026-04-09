export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  phoneNumber: string;
  preferredLanguage: string;
  preferredCurrency: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  displayName: string;
  role: string;
  requiresMfa: boolean;
  preferredLanguage: string;
  preferredCurrency: string;
}

export interface User {
  email: string;
  displayName: string;
  role: string;
  has2fa: boolean;
  preferredLanguage: string;
  preferredCurrency: string;
}
