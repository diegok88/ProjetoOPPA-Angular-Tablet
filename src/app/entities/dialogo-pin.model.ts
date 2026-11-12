import { Icone } from '../components/icones-svg/icones-svg';

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
