/** Espelha a entidade EstadoAtivo do back */
export interface EstadoAtivoModel {
  id: string;
  codigo?: string;
  alocacaoId?: string;
  tagAtivoId: string;
  tipoEstado: string;
  dataInicial: string | Date;
  dataFinal?: string | Date | null;
  duracao?: number | null;
  status: boolean;
  tagAtivo?: {
    id: string;
    codigo?: string;
    descricao: string;
    ativo?: { id: string; descricao: string; modelo?: string; setorId?: string };
  };
}
