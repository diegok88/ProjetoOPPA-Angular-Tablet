import { Observable } from 'rxjs';
import { Icone } from '../../icones-svg/icones-svg';

export type ResultadoListar = 'finalizado' | 'cancelado';

export interface DialogoListarData<T = any> {
  icone: Icone;
  titulo: string;
  mensagem: string;
  dados?: T[];
  campoRotulo?: string;
  campoDetalhe?: string;
  operacao?: string;
  erros?: string[];
  acao?: () => Promise<unknown> | Observable<unknown>;
}

export type PresetListar = Omit<DialogoListarData, 'acao' | 'dados'>;

export const LISTAGEM_DICA_SOLUCAO: PresetListar = {
  icone: 'solucao',
  titulo: 'Dica de Solução',
  mensagem: 'Procedimentos sugeridos. Avalie e volte para confirmar.',
  operacao: 'Voltar',
};
