import { HttpParams } from '@angular/common/http';
import {
  FiltroHistorico,
  StatusSolicitacao,
  TAMANHO_MAXIMO_PAGINA,
} from '../../historico-solicitacoes/anexos/historico-solicitacoes.model';

const CONSULTA = 'solicitacao_historico';

/** Trava a consulta no dia corrente (America/Sao_Paulo). Desligue para testar o restante. */
const FILTRAR_SOMENTE_HOJE = true;

function dataHoje(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function vazio(valor: unknown): boolean {
  if (valor === undefined || valor === null) return true;
  if (typeof valor === 'string' && valor.trim() === '') return true;
  if (Array.isArray(valor) && valor.length === 0) return true;
  return false;
}

function texto(valor?: string | null): string {
  return (valor ?? '').trim();
}

/**
 * Escopo por caixa — cada lado isolado.
 * NUNCA devolver os dois ids preenchidos: se o back aplicar AND, o resultado é vazio.
 */
function resolverEscopo(
  filtro: FiltroHistorico,
  caixa: FiltroHistorico['caixa'],
): { solicitanteId: string; solicitadoId: string } {
  const solicitanteId = texto(filtro.solicitanteId);
  const solicitadoId = texto(filtro.solicitadoId);

  if (caixa === 'enviadas') return { solicitanteId, solicitadoId: '' };
  if (caixa === 'recebidas') return { solicitanteId: '', solicitadoId };

  return { solicitanteId, solicitadoId };
}

export function normalizarFiltroSolicitacoes(
  filtro: FiltroHistorico,
): Record<string, string | number | boolean> {
  const page = Math.max(1, Math.trunc(Number(filtro.page) || 1));
  const size = Math.min(TAMANHO_MAXIMO_PAGINA, Math.max(1, Math.trunc(Number(filtro.size) || 10)));

  const situacoes: StatusSolicitacao[] = filtro.situacoes?.length
    ? filtro.situacoes
    : filtro.situacao
      ? [filtro.situacao]
      : [];

  const hoje = dataHoje();
  const escopo = resolverEscopo(filtro, filtro.caixa);

  const pares: Record<string, string | number | boolean | undefined | null> = {
    consulta: CONSULTA,

    solicitanteId: escopo.solicitanteId,
    solicitadoId: escopo.solicitadoId,
    tagAtivoId: texto(filtro.tagAtivoId),
    tipoSolicitacaoId: texto(filtro.tipoSolicitacaoId),

    situacao: situacoes.length === 1 ? situacoes[0] : undefined,
    situacoes: situacoes.length > 1 ? situacoes.join(',') : undefined,

    busca: texto(filtro.busca),

    caixa: filtro.caixa,
    desvios: filtro.desvios,

    dataEnvio: FILTRAR_SOMENTE_HOJE ? hoje : undefined,
    dataEnvioAte: FILTRAR_SOMENTE_HOJE ? hoje : undefined,

    dataVisualizacao: texto(filtro.dataVisualizacao),
    dataResposta: texto(filtro.dataResposta),

    apenasNaoVisualizadas: filtro.apenasNaoVisualizadas || undefined,
    apenasComResposta: filtro.apenasComResposta || undefined,

    ordenarPor: filtro.ordenarPor,
    ordem: filtro.ordem,

    page,
    size,
  };

  const saida: Record<string, string | number | boolean> = {};

  for (const [chave, valor] of Object.entries(pares)) {
    if (vazio(valor)) continue;
    saida[chave] = typeof valor === 'boolean' ? valor : String(valor).trim();
  }

  return saida;
}

export function buildSolicitacoesParams(filtro: FiltroHistorico): HttpParams {
  let params = new HttpParams();

  for (const [chave, valor] of Object.entries(normalizarFiltroSolicitacoes(filtro))) {
    params = params.set(chave, String(valor));
  }

  return params;
}

export function buildSolicitacoesPayload(
  filtro: FiltroHistorico,
): Record<string, string | number | boolean> {
  return normalizarFiltroSolicitacoes(filtro);
}
