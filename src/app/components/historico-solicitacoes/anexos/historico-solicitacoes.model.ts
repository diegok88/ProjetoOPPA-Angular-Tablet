/* ==================== TIPOS BASE ==================== */

export type StatusSolicitacao = 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'CANCELADA';

export type CaixaHistorico = 'todas' | 'recebidas' | 'enviadas';

export type RecorteHistorico =
  | ''
  | 'pendentes'
  | 'respondidas'
  | 'encerradas'
  | 'canceladas'
  | 'aguardandoVisualizacao'
  | 'semTipo';

export type CampoOrdenacao = 'dataEnvio' | 'dataVisualizacao' | 'dataResposta';

export type Ordem = 'asc' | 'desc';

/** Relação da linha com o operador alocado. */
export type RelacaoLinha = 'enviada' | 'recebida';

/* ==================== ATIVOS E FORMULÁRIO ==================== */

export interface TagAtivoDisponivel {
  id: string;
  codigo: string | null;
  descricao: string | null;
  ativoDescricao: string | null;
}

export interface SolicitacaoForm {
  solicitanteId: string;
  solicitadoId: string;
  tipoSolicitacaoId?: string;
  tagAtivoId?: string;
  observacao?: string;
}

export interface TipoSolicitacaoModel {
  id: string;
  nome?: string | null;
  descricao?: string | null;
}

/* ==================== HISTÓRICO ==================== */

/**
 * O back pode devolver o id da pessoa em campos diferentes.
 * Todos entram na comparação de relação, senão a linha cai como "enviada".
 */
export interface PessoaHistorico {
  id: string;
  nome: string;
  cracha?: string | null;
  usuarioId?: string | null;
  operadorId?: string | null;
  colaboradorId?: string | null;
}

export interface ReferenciaHistorico {
  id: string;
  descricao: string;
}

export interface LinhaHistorico {
  id: string;
  situacao: StatusSolicitacao;
  observacao?: string | null;

  dataEnvio: string;
  dataVisualizacao?: string | null;
  dataResposta?: string | null;

  solicitante?: PessoaHistorico | null;
  solicitado?: PessoaHistorico | null;
  tipoSolicitacao?: ReferenciaHistorico | null;
  tagAtivo?: ReferenciaHistorico | null;

  solicitanteId?: string | null;
  solicitadoId?: string | null;

  /** Preenchido no cliente durante a carga. */
  relacao?: RelacaoLinha;
}

export interface PaginaHistorico {
  dados: LinhaHistorico[];
  total: number;
  pagina: number;
  tamanho: number;
}

export interface FiltroHistorico {
  page: number;
  size: number;
  caixa: CaixaHistorico;
  desvios: RecorteHistorico;
  situacao: StatusSolicitacao | '';
  situacoes: StatusSolicitacao[];
  solicitanteId: string;
  solicitadoId: string;
  tipoSolicitacaoId: string;
  tagAtivoId: string;
  busca: string;
  dataInicio: string;
  dataFim: string;
  dataVisualizacao: string;
  dataResposta: string;
  apenasNaoVisualizadas: boolean;
  apenasComResposta: boolean;
  ordenarPor: CampoOrdenacao;
  ordem: Ordem;
}

/* ==================== CONTADOR ==================== */

export interface ContadorFaixa {
  pendentes: number;
  aceitas: number;
  recusadas: number;
  canceladas: number;
}

export interface ContadorSolicitacoes {
  recebidas: ContadorFaixa;
  enviadas: ContadorFaixa;
  naoVisualizadas: number;
}

/* ==================== CONSTANTES ==================== */

export const TAMANHO_MAXIMO_PAGINA = 100;

export const FILTRO_HISTORICO_INICIAL: FiltroHistorico = {
  page: 1,
  size: 10,
  caixa: 'todas',
  desvios: '',
  situacao: '',
  situacoes: [],
  solicitanteId: '',
  solicitadoId: '',
  tipoSolicitacaoId: '',
  tagAtivoId: '',
  busca: '',
  dataInicio: '',
  dataFim: '',
  dataVisualizacao: '',
  dataResposta: '',
  apenasNaoVisualizadas: false,
  apenasComResposta: false,
  ordenarPor: 'dataEnvio',
  ordem: 'desc',
};

export const OPCOES_TAMANHO = [5, 10, 20, 50, 100] as const;

export const OPCOES_SITUACAO: { valor: StatusSolicitacao; label: string }[] = [
  { valor: 'PENDENTE', label: 'Pendente' },
  { valor: 'ACEITA', label: 'Aceita' },
  { valor: 'RECUSADA', label: 'Recusada' },
  { valor: 'CANCELADA', label: 'Cancelada' },
];

export const OPCOES_RECORTE: { valor: RecorteHistorico; label: string }[] = [
  { valor: '', label: 'Todos' },
  { valor: 'pendentes', label: 'Pendentes' },
  { valor: 'respondidas', label: 'Respondidas' },
  { valor: 'encerradas', label: 'Encerradas' },
  { valor: 'canceladas', label: 'Canceladas' },
  { valor: 'aguardandoVisualizacao', label: 'Aguardando visualização' },
  { valor: 'semTipo', label: 'Sem tipo' },
];

export const ROTULO_SITUACAO: Record<StatusSolicitacao, string> = {
  PENDENTE: 'Pendente',
  ACEITA: 'Aceita',
  RECUSADA: 'Recusada',
  CANCELADA: 'Cancelada',
};
