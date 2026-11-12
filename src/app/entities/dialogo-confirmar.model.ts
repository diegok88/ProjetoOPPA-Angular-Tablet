import { Icone } from '../components/icones-svg/icones-svg';

export type ResultadoDialogoConfirmar = 'finalizado' | 'erro' | 'cancelado';

export interface DialogoConfirmarData<T = unknown> {
  icone: Icone;
  titulo: string;
  entidade?: string;
  mensagem: string;
  dados?: string;
  acao: () => Promise<T> | import('rxjs').Observable<T>;
}
export type PresetConfirmar = Omit<DialogoConfirmarData, 'acao'>;

export const CONFIRMAR_BLOQUEIO_FLUXO: PresetConfirmar = {
  icone: 'block',
  titulo: 'Bloqueado',
  mensagem: 'Deseja confirmar a verificação do',
};

export const CONFIRMAR_INICIAR_FLUXO: PresetConfirmar = {
  icone: 'sync',
  titulo: 'Verificar',
  mensagem: 'Deseja confirmar a verificação do',
};

export const CONFIRMAR_CADASTRAR: PresetConfirmar = {
  icone: 'adicionar',
  titulo: 'Novo',
  mensagem: 'Deseja confirmar o cadastro',
};

export const CONFIRMAR_ATUALIZAR: PresetConfirmar = {
  icone: 'editar',
  titulo: 'Atualizar',
  mensagem: 'Deseja confirmar a atualização',
};

export const CONFIRMAR_CANCELAMENTO: PresetConfirmar = {
  icone: 'cancelar',
  titulo: 'Cancelar',
  mensagem: 'Deseja confirmar o cancelamento',
};

export const CONFIRMAR_EXECUCAO: PresetConfirmar = {
  icone: 'jornada',
  titulo: 'Executar',
  mensagem: 'Deseja confirmar a execução novamente',
};

export const CONFIRMAR_FINALIZAR: PresetConfirmar = {
  icone: 'sucesso',
  titulo: 'Finalizar',
  mensagem: 'Deseja confirmar a finalização',
};

export const CONFIRMAR_ATIVAR: PresetConfirmar = {
  icone: 'sucesso',
  titulo: 'Ativar',
  mensagem: 'Deseja confirmar a ativação',
};

export const CONFIRMAR_INATIVAR: PresetConfirmar = {
  icone: 'cancelar',
  titulo: 'Inativar',
  mensagem: 'Deseja confirmar a inativação',
};

export const CONFIRMAR_INDISPONIVEL: PresetConfirmar = {
  icone: 'alerta',
  titulo: 'Indisponibilizar',
  mensagem: 'Deseja confirmar a indisponibilidade',
};

export const CONFIRMAR_ELIMINAR: PresetConfirmar = {
  icone: 'apagar',
  titulo: 'Eliminar',
  mensagem: 'Deseja confirmar a eliminação',
};
