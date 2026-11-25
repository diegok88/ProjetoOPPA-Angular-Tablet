import { Observable } from 'rxjs';
import { Icone } from '../../icones-svg/icones-svg';

export type ResultadoDialogoConfirmar = 'finalizado' | 'erro' | 'cancelado' | 'neutro';

export interface DialogoConfirmarData<T = unknown> {
  icone: Icone;
  titulo: string;
  mensagem?: string;
  botaoNegacao?: string;
  botaoNeutro?: string;
  botaoConfirmacao?: string;
  dados?: string;
  acao: () => Promise<T> | import('rxjs').Observable<T>;
  acaoNeutro?: () => Promise<unknown> | Observable<unknown>;
}
export type PresetConfirmar = Omit<DialogoConfirmarData, 'acao'>;

export const FLUXO_CONFIRMAR_CADASTRAR: PresetConfirmar = {
  icone: 'adicionar',
  titulo: 'Confirmar',
  mensagem: 'Deseja confirmar cadastro',
  botaoNegacao: 'Cancelar',
  botaoConfirmacao: 'Cadastrar',
};

export const FLUXO_CONFIRMAR_FALHA_TRANSFERIDA: PresetConfirmar = {
  icone: 'alerta',
  titulo: 'Confirmar falha registrada',
  mensagem: 'Confira se a falha descrita abaixo está correta antes de seguir para a verificação.',
  botaoNegacao: 'Cancelar',
  botaoNeutro: 'Não, corrigir falha',
  botaoConfirmacao: 'Sim, está correta',
};

export const FLUXO_CONFIRMAR_REGISTRAR_FALHA: PresetConfirmar = {
  icone: 'adicionar',
  titulo: 'Registrar a Falha no Ativo?',
  mensagem: 'Ao confirmar a ação, a falha será registrada e ocorrência será aberta para a solução.',
  botaoNegacao: 'Cancelar',
  botaoConfirmacao: 'Registrar',
};

export const FLUXO_CONFIRMAR_INICIO_OCORRENCIA: PresetConfirmar = {
  icone: 'sync',
  titulo: 'Iniciar a Solução?',
  mensagem: 'Ao confirmar a ação, inicie a verificação do ativo.',
  botaoNegacao: 'Cancelar',
  botaoConfirmacao: 'Iniciar',
};

export const FLUXO_CONFIRMAR_BLOQUEIO_OCORRENCIA: PresetConfirmar = {
  icone: 'block',
  titulo: 'Ativo Bloqueado!',
  mensagem: 'Colaborador trabalhando, ao solucionar confirme a ação.',
  botaoNegacao: 'Cancelar',
  botaoNeutro: 'Dica de Solução',
  botaoConfirmacao: 'Confirmar',
};

export const FLUXO_CONFIRMAR_SOLUCAO: PresetConfirmar = {
  icone: 'help',
  titulo: 'Falha Solucionada?',
  mensagem: 'Você conseguiu solucionar a falha deste ativo?',
  botaoNegacao: 'Cancelar',
  botaoNeutro: 'Não solucionei',
  botaoConfirmacao: 'Sim, solucionei',
};

export const SOLICITACAO_CONFIRMAR_ENVIO: PresetConfirmar = {
  icone: 'adicionar',
  titulo: 'Solicitar Encarregado?',
  mensagem: 'Confirme os dados abaixo para enviar a solicitação.',
  botaoNegacao: 'Cancelar',
  botaoConfirmacao: 'Enviar solicitação',
};
