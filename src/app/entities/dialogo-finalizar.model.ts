import { Icone } from '../components/icones-svg/icones-svg';

export interface DialogoFinalizarData {
  icone: Icone;
  titulo: string;
  operacao?: string;
  dados?: string;
  mensagem: string;
  erros?: string[];
}

export const FINALIZAR_SUCESSO: DialogoFinalizarData = {
  icone: 'sucesso',
  titulo: 'Sucesso!',
  mensagem: 'Realizado com exíto a operação.',
};

export const FINALIZAR_ERRO: DialogoFinalizarData = {
  icone: 'erro',
  titulo: 'Erro!',
  mensagem: 'Falha na realização da operação.',
};

export const FINALIZAR_CANCELAR: DialogoFinalizarData = {
  icone: 'cancelar',
  titulo: 'Cancelado!',
  mensagem: 'Cancelada com exíto a operação.',
};

export const RESULTADO_FINALIZAR = 'finalizado' as const;
export type ResultadoFinalizar = typeof RESULTADO_FINALIZAR;

export interface DialogoFinalizarDataRetorno<T = unknown> {
  icone: Icone;
  titulo: string;
  operacao?: string;
  dados?: string;
  mensagem: string;
  erros?: string[];
  acao: () => Promise<T> | import('rxjs').Observable<T>;
}
export type PresetFinalizar = Omit<DialogoFinalizarDataRetorno, 'acao'>;

export const FINALIZAR_SUCESSO_RETORNO: PresetFinalizar = {
  icone: 'sucesso',
  titulo: 'Sucesso!',
  mensagem: 'Realizado com exíto a operação.',
};

export const FINALIZAR_CANCELADO_RETORNO: PresetFinalizar = {
  icone: 'cancelar',
  titulo: 'Cancelado!',
  mensagem: 'Cancelado a execução da operação.',
};

export const FINALIZAR_ERRO_RETORNO: PresetFinalizar = {
  icone: 'erro',
  titulo: 'Erro!',
  mensagem: 'Falha na realização da operação.',
};

export const FINALIZAR_INICIAR_RETORNO: PresetFinalizar = {
  icone: 'sync',
  titulo: 'Erro!',
  mensagem: 'Falha na realização da operação.',
};

/*
export const FINALIZAR_ERRO_FORM: DialogoFinalizarData = {
  icone: '/icons/error_84.png',
  titulo: 'Erro!',
  mensagem: 'Formulário inválido, verifique!.',
};

export const FINALIZAR_ERRO_ALT: DialogoFinalizarData = {
  icone: '/icons/error_84.png',
  titulo: 'Erro!',
  mensagem: 'Formulário sem alteração, verifique!.',
};

export const FINALIZAR_ERRO_ACT: DialogoFinalizarData = {
  icone: '/icons/error_84.png',
  titulo: 'Erro!',
  mensagem: 'Registro está ativo, verifique!.',
};

export const FINALIZAR_ERRO_FIN: DialogoFinalizarData = {
  icone: '/icons/error_84.png',
  titulo: 'Erro!',
  mensagem: 'Registro está finalizado, verifique!.',
};

export const FINALIZAR_ALERTA: DialogoFinalizarData = {
  icone: '/icons/error_84.png',
  titulo: 'Alerta!',
  mensagem: 'Operação possui registros cadastrados, verifique!.',
};

*/
