import { Icone } from '../../icones-svg/icones-svg';

export interface configFinalizarRetorno {
  icone: Icone;
  titulo: string;
}

export interface DialogoFinalizarDataRetorno<T = unknown> {
  icone: Icone;
  titulo: string;
  dados?: string;
  mensagem: string;
  operacao?: string;
  erros?: string[];
  acao: () => Promise<T> | import('rxjs').Observable<T>;
}
export type PresetFinalizar = Omit<DialogoFinalizarDataRetorno, 'acao'>;

// --------------Constantes bases-------------------------
export const FINALIZAR_SUCESSO: configFinalizarRetorno = {
  icone: 'sucesso',
  titulo: 'Sucesso na Operação!',
};

export const FINALIZAR_CANCELAR: configFinalizarRetorno = {
  icone: 'cancelar',
  titulo: 'Cancelado a Operação!',
};

export const FINALIZAR_ERRO: configFinalizarRetorno = {
  icone: 'erro',
  titulo: 'Erro na Operação!',
};

export const FINALIZAR_BLOQUEADO: configFinalizarRetorno = {
  icone: 'block',
  titulo: 'Bloqueado a Operação!',
};

export const FINALIZAR_NAO_AUTORIZADO: configFinalizarRetorno = {
  icone: 'nao_autorizado',
  titulo: 'Bloqueado a Operação!',
};

//-----------------Constantes direcionadas-------------------
export const FINALIZAR_SUCESSO_REGISTRAR_FALHA: PresetFinalizar = {
  ...FINALIZAR_SUCESSO,
  mensagem: 'Realizado o registro da falha com êxito.',
  operacao: 'Ok',
};

export const FINALIZAR_CANCELADO_REGISTRAR_FALHA: PresetFinalizar = {
  ...FINALIZAR_CANCELAR,
  mensagem: 'Ao cancelar operação de registro a falha permanece ativa.',
  operacao: 'Ok',
};

export const FINALIZAR_ERRO_REGISTRAR_FALHA: PresetFinalizar = {
  ...FINALIZAR_ERRO,
  mensagem: 'Erro na realização da operação de registro da falha, tente novamente.',
  operacao: 'Ok',
};

export const FINALIZAR_SUCESSO_INICIAR: PresetFinalizar = {
  ...FINALIZAR_SUCESSO,
  mensagem: 'Realizado o registro da verificação do ativo com êxito.',
};

export const FINALIZAR_CANCELADO_INICIAR: PresetFinalizar = {
  ...FINALIZAR_CANCELAR,
  mensagem: 'Ao cancelar operação de verificação a falha permanece ativa.',
  operacao: 'Ok',
};

export const FINALIZAR_ERRO_INICIAR: PresetFinalizar = {
  ...FINALIZAR_ERRO,
  mensagem: 'Erro na realização da operação de verificação do ativo.',
  operacao: 'Ok',
};

export const FINALIZAR_NAO_AUTORIZADO_INICIAR: PresetFinalizar = {
  ...FINALIZAR_NAO_AUTORIZADO,
  mensagem: 'Erro na realização da operação de verificação do ativo.',
  operacao: 'Ok',
};

export const FINALIZAR_SUCESSO_TRANSFERIR: PresetFinalizar = {
  ...FINALIZAR_SUCESSO_INICIAR,
  mensagem: 'Ocorrência transferida. Outro perfil deve iniciar nova verificação.',
  operacao: 'Ok',
};

export const FINALIZAR_SUCESSO_FINALIZAR: PresetFinalizar = {
  ...FINALIZAR_SUCESSO_INICIAR,
  mensagem: 'Ocorrência finalizada e ativo liberado para produção.',
  operacao: 'Ok',
};

export const SOLICITACAO_FINALIZAR_SUCESSO: PresetFinalizar = {
  ...FINALIZAR_SUCESSO,
  mensagem: 'Solicitação enviada ao supervisor com êxito.',
  operacao: 'Ok',
};

export const SOLICITACAO_FINALIZAR_CANCELAR: PresetFinalizar = {
  ...FINALIZAR_CANCELAR,
  mensagem: 'Ao cancelar, nenhuma solicitação foi enviada ao supervisor.',
  operacao: 'Ok',
};

export const SOLICITACAO_FINALIZAR_ERRO: PresetFinalizar = {
  ...FINALIZAR_ERRO,
  mensagem: 'Erro ao enviar a solicitação ao supervisor, tente novamente.',
  operacao: 'Ok',
};
