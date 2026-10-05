export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
  error: {
    code: string;
  };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN';
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
