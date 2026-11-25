import { Icone } from '../../icones-svg/icones-svg';

export interface DialogoPinData<T = unknown> {
  icone: Icone;
  titulo: string;
  mensagem: string;
  usuario?: string;
  tamanhoPin?: number;
  acao?: (pin: string) => Promise<T> | import('rxjs').Observable<T>;
}

export const PIN_JORNADA: Omit<DialogoPinData, 'acao'> = {
  icone: 'pin',
  titulo: 'Controle de Jornada',
  mensagem: 'Digite seu PIN para confirmar a operação.',
};

export const PIN_CADASTRO_FALHA: Omit<DialogoPinData, 'acao'> = {
  icone: 'pin',
  titulo: 'Cadastrar Falha',
  mensagem: 'Digite seu PIN para confirmar a operação.',
};

export const PIN_INICIAR_FLUXO: Omit<DialogoPinData, 'acao'> = {
  icone: 'pin',
  titulo: 'Iniciar a verificação',
  mensagem: 'Digite seu PIN para confirmar a operação.',
};

export const PIN_CONFIRMAR_SOLUCAO: Omit<DialogoPinData, 'acao'> = {
  icone: 'pin',
  titulo: 'Confirmar Solução',
  mensagem: 'Digite seu PIN para confirmar a solução da falha.',
};

export const PIN_SOLICITAR_ENCARREGADO: Omit<DialogoPinData, 'acao'> = {
  icone: 'pin',
  titulo: 'Confirmar solicitação',
  mensagem: 'Digite seu PIN para solicitar o supervisor.',
};
