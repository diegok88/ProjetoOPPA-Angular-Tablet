export interface FalhasModel {
  id?: string;
  codigo?: string;
  descricao: string;
  ativoId: string;
  ativo?: { descricao: string; modelo: string } | null;
  direcionamentoId: string;
  perfil?: { descricao: string; nivel: string } | null;
  status?: boolean;
}

export interface FalhasQuery {
  codigo?: string;
  descricao?: string;
  ativoId?: string;
  direcionamentoId?: string;
  status?: boolean;
  consulta?: string;
  desvios?: string;
  page?: number;
  size?: number;
}
