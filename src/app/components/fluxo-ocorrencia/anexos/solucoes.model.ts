export interface SolucoesModel {
  id?: string;
  codigo?: number;
  falhaId: string;
  falha: { descricao: string } | null;
  direcionamentoId: string;
  perfil?: { descricao: string; nivel: string } | null;
  descricao?: string;
  status?: boolean;
}

export interface SolucoesQuery {
  codigo?: number;
  falhaId?: string;
  direcionamentoId?: string;
  desPerfil?: string;
  descricao?: string;
  status?: boolean;
  consulta?: string;
  desvios?: string;
  page?: number;
  size?: number;
}
