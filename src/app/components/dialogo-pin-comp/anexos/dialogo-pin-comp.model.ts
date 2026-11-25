import { Observable } from 'rxjs';
import { Icone } from '../../icones-svg/icones-svg';

export interface Credencial {
  cracha: number;
  pin: string;
}

export type ResultadoCredencial = 'finalizado' | 'cancelado' | 'erro';

export interface DialogoCredencialData<T = unknown> {
  icone: Icone;
  titulo: string;
  mensagem: string;
  usuario?: string;
  rotuloCracha?: string;
  rotuloPin?: string;
  crachaNumerico?: boolean;
  tamanhoMinimoPin?: number;
  tamanhoMaximoPin?: number;
  acao?: (credencial: Credencial) => Promise<T> | Observable<T>;
}

export const CREDENCIAL_INICIAR_FLUXO: Omit<DialogoCredencialData, 'acao'> = {
  icone: 'pin',
  titulo: 'Iniciar a verificação',
  mensagem: 'Informe o número do crachá e a senha para confirmar a operação.',
};

export const CREDENCIAL_CONFIRMAR_SOLUCAO: Omit<DialogoCredencialData, 'acao'> = {
  icone: 'pin',
  titulo: 'Confirmar solução',
  mensagem: 'Informe o número do crachá e a senha para confirmar a operação.',
};
