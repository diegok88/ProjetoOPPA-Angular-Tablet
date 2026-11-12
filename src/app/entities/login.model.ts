export interface LoginModel {
  codigo: string;
  senha: string;
  codEmpresa: string;
}

export type CampoLogin = keyof LoginModel;
