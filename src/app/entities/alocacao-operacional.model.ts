import { TurnoType } from './usuario.model';

/* MODELO DA ENTIDADE */
export interface AlocacaoOperacionalModel {
  id?: string;
  codigo?: number;
  operadorId?: string | null;
  operador?: { nome: string; cracha: number; turno: TurnoType } | null;
  gestorId?: string | null;
  gestor?: { nome: string; cracha: number } | null;
  tagAtivoId: string;
  tagAtivo?: {
    id: string;
    descricao: string;
    ativo: {
      id: string;
      descricao: string;
      modelo: string;
      setorId: string;
      setor: { id: string; descricao: string };
    };
  } | null;
  turno: TipoTurnoType;
  alocadoEm: Date | null;
  finalizadoEm: Date | null;
  condicao?: CondicaoAlocacaoType;
  situacao?: SituacaoAlocacaoType;
  status?: boolean;
}

export interface AlocacaoOperacionalUpdate {
  operadorId?: string;
  situacao: string;
  condicao?: string;
  alocadoEm?: Date;
  finalizadoEm?: Date;
}

/* TIPOS DE TURNO */
export const TipoTurno = {
  MANHA: { valor: 'MANHA', label: 'MANHÃ' },
  TARDE: { valor: 'TARDE', label: 'TARDE' },
  NOITE: { valor: 'NOITE', label: 'NOITE' },
} as const;

export type TipoTurnoType = (typeof TipoTurno)[keyof typeof TipoTurno]['valor'];

/* CONDIÇÕES DA ALOCAÇÃO */
export const CondicaoAlocacao = {
  ACEITO: { valor: 'ACEITO', label: 'ACEITO' },
  RECUSADO: { valor: 'RECUSADO', label: 'RECUSADO' },
  AGUARDANDO: { valor: 'AGUARDANDO', label: 'AGUARDANDO' },
  DISPENSADO: { valor: 'DISPENSADO', label: 'DISPENSADO' },
  INDISPONIBILIDADE: { valor: 'INDISPONIBILIDADE', label: 'INDISPONIBILIDADE' },
} as const;

export type CondicaoAlocacaoType =
  (typeof CondicaoAlocacao)[keyof typeof CondicaoAlocacao]['valor'];

/* SITUAÇÕES DA ALOCAÇÃO */
export const SituacaoAlocacao = {
  DISPONIVEL: { valor: 'DISPONIVEL', label: 'DISPONÍVEL' },
  ALOCADO: { valor: 'ALOCADO', label: 'ALOCADO' },
  INDISPONIVEL: { valor: 'INDISPONIVEL', label: 'INDISPONÍVEL' },
  FINALIZADO: { valor: 'FINALIZADO', label: 'FINALIZADO' },
} as const;

export type SituacaoAlocacaoType =
  (typeof SituacaoAlocacao)[keyof typeof SituacaoAlocacao]['valor'];
