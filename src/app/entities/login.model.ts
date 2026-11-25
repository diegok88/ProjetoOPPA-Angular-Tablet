export interface LoginModel {
  codigo: string;
  senha: string;
  codEmpresa: string;
}

export interface AutenticarModel {
  id: string;
  cracha: number;
  perfil: string;
}

export type CampoLogin = keyof LoginModel;
