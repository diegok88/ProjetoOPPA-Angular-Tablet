import { Observable } from 'rxjs';
import { Icone } from '../../icones-svg/icones-svg';
import { TipoOcorrencia, TipoOcorrenciaType } from '../../fluxo-ocorrencia/anexos/ocorrencia.model';

export interface SolucaoOpcao {
  id: string;
  codigo?: number | null;
  descricao: string;
}

/** Opção renderizada pelo select de tipo (quando manutencao = true) */
export interface TipoOcorrenciaOpcao {
  valor: TipoOcorrenciaType;
  label: string;
}

/** Lista derivada do enum — usada pelo select dinâmico */
export const TIPOS_OCORRENCIA_OPCOES: TipoOcorrenciaOpcao[] = Object.values(TipoOcorrencia).map(
  (tipo) => ({ valor: tipo.valor, label: tipo.label }),
);

export type RetornoDialogoSolucao =
  | { resultado: 'finalizado'; solucaoId: string; tipoOcorrencia: TipoOcorrenciaType }
  | 'finalizado'
  | 'erro'
  | 'cancelado';

export type ResultadoDialogoSolucao = string | 'finalizado' | 'erro' | 'cancelado' | undefined;

export interface SolucaoOcorrencia {
  solucaoId: string;
  tipoOcorrencia: TipoOcorrenciaType;
}

export interface DialogoSolucaoData<T = unknown> {
  icone: Icone;
  titulo: string;
  mensagem?: string;
  usuario?: string;
  label: string;
  placeholder?: string;
  obrigatorio?: boolean;
  manutencao?: boolean;
  labelTipo?: string;
  placeholderTipo?: string;
  tipoPadrao?: TipoOcorrenciaType;
  tipoFallback?: TipoOcorrenciaType;

  textoConfirmar?: string;
  opcoes: SolucaoOpcao[];
  acao?: (solucao: SolucaoOcorrencia) => Promise<T> | Observable<T>;
}

export const SOLUCAO_FINALIZAR_OCORRENCIA: Omit<DialogoSolucaoData, 'opcoes' | 'acao'> = {
  icone: 'falha',
  titulo: 'Falha solucionada',
  mensagem: 'Selecione a solução aplicada para registrar a finalização da ocorrência.',
  label: 'Solução aplicada',
  placeholder: 'Selecione uma solução',
  obrigatorio: true,
  textoConfirmar: 'Registrar',
  manutencao: false,
};

export const SOLUCAO_FINALIZAR_OCORRENCIA_MANUTENCAO: Omit<DialogoSolucaoData, 'opcoes' | 'acao'> =
  {
    icone: 'falha',
    titulo: 'Falha solucionada',
    mensagem: 'Selecione a solução aplicada e o tipo de ocorrência para finalizar.',
    label: 'Solução aplicada',
    placeholder: 'Selecione uma solução',
    obrigatorio: true,
    textoConfirmar: 'Registrar',
    manutencao: true,
    labelTipo: 'Tipo de ocorrência',
    placeholderTipo: 'Selecione o tipo',
    tipoPadrao: TipoOcorrencia.MANUTENCAO.valor,
    tipoFallback: TipoOcorrencia.OPERACIONAL.valor,
  };
