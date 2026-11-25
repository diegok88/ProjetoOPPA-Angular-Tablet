export interface SolicitacoesModel {
  id: string;
  solicitanteId: string | null;
  solicitadoId: string;
  tagAtivoId: string | null;
  tipoSolicitacaoId: string | null;
  situacao: 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'CANCELADA';
  observacao: string | null;
  dataEnvio: string;
  dataVisualizacao: string | null;
  dataResposta: string | null;
  status: boolean;
}

export interface TipoSolicitacaoModel {
  id: string;
  descricao: string;
  status: boolean;
}

export interface SolicitacaoForm {
  solicitadoId: string;
  solicitanteId: string;
  tipoSolicitacaoId?: string;
  tagAtivoId?: string;
  observacao?: string;
}

export interface ContadorSolicitacoes {
  recebidas: {
    pendentes: number;
    aceitas: number;
    recusadas: number;
    canceladas: number;
  };
  enviadas: {
    pendentes: number;
    aceitas: number;
    recusadas: number;
    canceladas: number;
  };
  naoVisualizadas: number;
}

export type EventoSolicitacao = { tipo: 'ABRIR' };
