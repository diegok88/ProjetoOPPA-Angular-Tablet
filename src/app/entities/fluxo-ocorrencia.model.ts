export interface FluxoOcorrenciaModel {
  id: string;
  codigo: number;
  ocorrenciaId: string;
  usuarioId: string;
  transferidoPerfilId: string;
  transferidoPerfil?: { id: string; descricao: string; nivel: string };
  dataInicial: Date;
  dataFinal: Date;
  duracao: number;
  status: boolean;
}

export interface FluxoOcorrenciaForm {
  ocorrenciaId?: string;
  usuarioId?: string;
  transferidoPerfilId?: string;
}

export interface FluxoOcorrenciaQuery {
  codigo?: number;
  ocorrenciaId?: string;
  usuarioId?: string;
  transferidoPerfilId?: string;
  dataInicial?: string;
  dataFinal?: string;
  duracao?: number;
  status?: boolean;
  consulta?: string;
  desvios?: string;
  page?: number;
  size?: number;
}
