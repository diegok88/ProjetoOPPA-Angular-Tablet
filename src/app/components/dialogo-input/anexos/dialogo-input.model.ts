import { Icone } from '../../icones-svg/icones-svg';

export type ResultadoDialogoInput = string | 'finalizado' | 'erro' | 'cancelado' | undefined;

export interface DialogoInputData<T = unknown> {
  icone: Icone;
  titulo: string;
  mensagem?: string;
  usuario?: string;
  label: string;
  placeholder?: string;
  maxLength?: number;
  obrigatorio?: boolean;
  maiusculo?: boolean;
  textoConfirmar?: string;
  acao?: (valor: string) => Promise<T> | import('rxjs').Observable<T>;
}

export const INPUT_CODIGO_FALHA: Omit<DialogoInputData, 'acao'> = {
  icone: 'falha',
  titulo: 'Ocorrência em aberto!',
  mensagem: 'Informe o código da falha para registrar a ocorrência.',
  label: 'Código da falha',
  placeholder: 'Ex.: F01, A123',
  maxLength: 8,
  obrigatorio: true,
  maiusculo: true,
};
