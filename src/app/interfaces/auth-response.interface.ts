export interface AuthResponse {
  message: string;
  accessToken?: string;
  usuario?: { id: string; perfil: string; empresa: string };
}
