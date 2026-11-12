export interface OcorrenciaModel {
  id: string;
  codigo: number;
  estadoAtivoId: string;
  falhaId: string;
  solucaoId: string;
  tipoOcorrencia: TipoOcorrenciaType;
  condicaoOcorrencia: CondicaoOcorrenciaType;
  solucionadoId: string;
  dataInicial: Date | null;
  dataFalhaRegistrado: Date | null;
  dataFinal: Date | null;
  statusFalha: boolean;
  status: boolean;
}

export interface OcorrenciaQuery {
  codigo?: number;
  estadoAtivoId?: string;
  tagAtivoId?: string;
  falhaId?: string;
  solucaoId?: string;
  tipoOcorrencia?: TipoOcorrenciaType;
  condicaoOcorrencia?: CondicaoOcorrenciaType;
  solucionadoId?: string;
  dataInicial?: string;
  dataFalhaRegistrado?: string;
  dataFinal?: string;
  statusFalha?: boolean;
  status?: boolean;
  consulta?: string;
  desvios?: string;
  page?: number;
  size?: number;
}

export interface OcorrenciaForm {
  falhaId?: string;
  solucaoId?: string;
  solucionadoId?: string;
}

export const CondicaoOcorrencia = {
  EXECUCAO: { valor: 'EXECUCAO', label: 'EXECUÇÃO' },
  FINALIZADO: { valor: 'FINALIZADO', label: 'FINALIZADO' },
};
export type CondicaoOcorrenciaType =
  (typeof CondicaoOcorrencia)[keyof typeof CondicaoOcorrencia]['valor'];

export const TipoOcorrencia = {
  OPERACIONAL: { valor: 'OPERACIONAL', label: 'OPERACIONAL' },
  MANUTENCAO: { valor: 'MANUTENCAO', label: 'MANUTENÇÃO' },
  QUALIDADE: { valor: 'QUALIDADE', label: 'QUALIDADE' },
};
export type TipoOcorrenciaType = (typeof TipoOcorrencia)[keyof typeof TipoOcorrencia]['valor'];
