export interface UsuarioModel {
  id?: string;
  cracha?: number;
  codigo?: string;
  tagAtivoId?: string;
  nome: string;
  dataNascimento: Date | null;
  dataAdmissao?: Date | null;
  dataDesligamento?: Date | null;
  perfilId?: string | null;
  perfil?: { descricao: string; nivel: string };
  turno: string;
  escala: string;
  empresaId?: string | null;
  empresa?: { razaoSocial: string };
  status?: boolean;
  gestorComoColaborador?: { id: string; gestor: { nome: string; cracha: number } }[];
}

export const Turnos = {
  MANHA: 'MANHA',
  TARDE: 'TARDE',
  NOITE: 'NOITE',
  COMERCIAL: 'COMERCIAL',
} as const;

export type TurnoType = (typeof Turnos)[keyof typeof Turnos];
