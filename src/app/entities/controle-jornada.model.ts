export const tipoJornada = {
  ENTRADA_EXPEDIENTE: { valor: 'ENTRADA_EXPEDIENTE', label: 'ENTRADA EXPEDIENTE' },
  SAIDA_INTERVALO: { valor: 'SAIDA_INTERVALO', label: 'SAÍDA INTERVALO' },
  RETORNO_INTERVALO: { valor: 'RETORNO_INTERVALO', label: 'RETORNO INTERVALO' },
  SAIDA_EXPEDIENTE: { valor: 'SAIDA_EXPEDIENTE', label: 'SAÍDA EXPEDIENTE' },
} as const;

export type TipoJornadaType = (typeof tipoJornada)[keyof typeof tipoJornada]['valor'];

export const TipoEstadoJornada = {
  CONFORME: { valor: 'CONFORME', label: 'CONFORME' },
  ATRASO: { valor: 'ATRASO', label: 'ATRASO' },
  FALTA: { valor: 'FALTA', label: 'FALTA' },
  ANTECIPADO: { valor: 'ANTECIPADO', label: 'ANTECIPADO' },
} as const;

export type TipoEstadoJornadaType =
  (typeof TipoEstadoJornada)[keyof typeof TipoEstadoJornada]['valor'];

export const DecisaoJornada = {
  PAGINAR: { valor: 'paginar', label: 'PAGINAR' },
  HOJE: { valor: 'hoje', label: 'HOJE' },
  DESVIOS: { valor: 'desvios', label: 'DESVIOS' },
} as const;

export type DecisaoJornadaType = (typeof DecisaoJornada)[keyof typeof DecisaoJornada]['valor'];

export const OrdenacaoJornada = {
  FILTRAR: { valor: 'filtrar', label: 'FILTRAR' },
  MAIS_ANTIGOS: { valor: 'mais_antigos', label: 'MAIS ANTIGOS' },
  COLABORADOR: { valor: 'colaborador', label: 'COLABORADOR' },
} as const;

export type OrdenacaoJornadaType =
  (typeof OrdenacaoJornada)[keyof typeof OrdenacaoJornada]['valor'];

export interface ControleJornadaModel {
  id: string;
  codigo?: number;
  usuarioId: string;
  tipoJornada: TipoJornadaType;
  estadoJornada: TipoEstadoJornadaType;
  dataRegistro: string;
  tagAtivoId: string;
  status: boolean;

  dataRegistroBrasilia?: string;
}

export interface PaginatedResponse<T> {
  dados: T[];
  total: number;
  pagina: number;
  tamanho: number;
}

export type ControleJornadaResposta =
  | ControleJornadaModel[]
  | PaginatedResponse<ControleJornadaModel>;

export interface ControleJornadaQuery {
  codigo?: number;
  usuarioId?: string | null;
  tagAtivoId?: string;
  tipoJornada?: TipoJornadaType;
  estadoJornada?: TipoEstadoJornadaType;
  dataRegistro?: string;
  status?: boolean;
  consulta?: string;
  desvios?: string;
  page?: number;
  size?: number;
}

export interface ControleJornadaForm {
  usuarioId: string;
  tipoJornada: TipoJornadaType;
  tagAtivoId: string;
}

export function isPaginado(
  resposta: ControleJornadaResposta,
): resposta is PaginatedResponse<ControleJornadaModel> {
  return !Array.isArray(resposta);
}

export const SEQUENCIA_JORNADA: Record<TipoJornadaType, TipoJornadaType> = {
  ENTRADA_EXPEDIENTE: 'SAIDA_INTERVALO',
  SAIDA_INTERVALO: 'RETORNO_INTERVALO',
  RETORNO_INTERVALO: 'SAIDA_EXPEDIENTE',
  SAIDA_EXPEDIENTE: 'ENTRADA_EXPEDIENTE',
};

export const BOTAO_JORNADA: Record<
  TipoJornadaType,
  { label: string; icon: string; message: string }
> = {
  ENTRADA_EXPEDIENTE: { label: 'Entrar no Ativo', icon: 'login', message: 'Entrada no Ativo de' },
  SAIDA_INTERVALO: {
    label: 'Sair para Intervalo',
    icon: 'break',
    message: 'Saída para o intervalo no Ativo de',
  },
  RETORNO_INTERVALO: {
    label: 'Retornar do Intervalo',
    icon: 'resume',
    message: 'Retorno do intervalo no Ativo de',
  },
  SAIDA_EXPEDIENTE: { label: 'Sair do Ativo', icon: 'exit', message: 'Saída no Ativo de' },
};

export function proximoTipoJornada(ultimo?: ControleJornadaModel | null): TipoJornadaType {
  if (!ultimo) return 'ENTRADA_EXPEDIENTE';
  const proximo = SEQUENCIA_JORNADA[ultimo.tipoJornada as TipoJornadaType];
  if (!proximo) {
    console.warn('[modelo] tipoJornada desconhecido:', JSON.stringify(ultimo.tipoJornada), ultimo);
    return 'ENTRADA_EXPEDIENTE';
  }
  return proximo;
}
