import { HttpErrorResponse } from '@angular/common/http';

export type OrigemErro = 'http' | 'aplicacao' | 'desconhecido';

export interface MetaErro {
  origem: OrigemErro;
  status: number | null;
  statusText: string | null;
  url: string | null;
  /** Corpo da resposta, exatamente como a API devolveu. */
  corpo: unknown;
  /** Objeto original recebido no catchError. */
  bruto: unknown;
  /** Marcador interno para reconhecer um erro já normalizado. */
  __erroApi: true;
}

/**
 * Erro normalizado.
 *
 * É um array de strings — mantém compatibilidade com todo consumidor que já
 * tratava o erro do interceptor como `string[]` — mas carrega status, url e corpo.
 * `erro[0]` e `erro.length` continuam funcionando como antes.
 */
export type ErroApi = string[] & MetaErro;

const FALLBACK_PADRAO = 'Erro inesperado.';
const PROFUNDIDADE_MAXIMA = 5;

/** Campos que carregam mensagem legível, em ordem de prioridade. */
const CAMPOS_MENSAGEM = [
  'mensagens',
  'message',
  'messages',
  'mensagem',
  'detail',
  'details',
  'title',
  'errors',
  'erro',
  'error',
  'descricao',
  'motivo',
] as const;

function comoTexto(valor: unknown): string | null {
  if (typeof valor === 'string') {
    const texto = valor.trim();
    return texto ? texto : null;
  }
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  return null;
}

/** Varre o corpo em profundidade: ProblemDetails, dicionário de validação, array, string. */
function extrairDeCorpo(corpo: unknown, profundidade = 0): string[] {
  if (corpo === null || corpo === undefined) return [];
  if (profundidade > PROFUNDIDADE_MAXIMA) return [];

  const direto = comoTexto(corpo);
  if (direto) return [direto];

  if (Array.isArray(corpo)) {
    return corpo.flatMap((item) => extrairDeCorpo(item, profundidade + 1));
  }

  if (typeof corpo !== 'object') return [];

  const objeto = corpo as Record<string, unknown>;
  const coletadas: string[] = [];

  for (const campo of CAMPOS_MENSAGEM) {
    if (!(campo in objeto)) continue;
    const valor = objeto[campo];
    if (valor === null || valor === undefined) continue;

    // Array simples ou lista de objetos: recorre.
    if (Array.isArray(valor)) {
      coletadas.push(...extrairDeCorpo(valor, profundidade + 1));
      continue;
    }

    // Dicionário de validação: { falhaId: ["msg"], codigo: "msg" }
    if (typeof valor === 'object') {
      for (const [chave, conteudo] of Object.entries(valor as Record<string, unknown>)) {
        const mensagens = extrairDeCorpo(conteudo, profundidade + 1);
        if (!mensagens.length) continue;
        const prefixo = /^\d+$/.test(chave) ? '' : `${chave}: `;
        coletadas.push(...mensagens.map((m) => prefixo + m));
      }
      continue;
    }

    const texto = comoTexto(valor);
    if (texto) coletadas.push(texto);
  }

  return coletadas;
}

function deduplicar(mensagens: string[]): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];

  for (const mensagem of mensagens) {
    const texto = mensagem.trim();
    if (!texto || vistos.has(texto)) continue;
    vistos.add(texto);
    saida.push(texto);
  }

  return saida;
}

function criar(mensagens: string[], meta: Omit<MetaErro, '__erroApi'>): ErroApi {
  return Object.assign([...mensagens], meta, { __erroApi: true as const }) as ErroApi;
}

export function ehErroApi(valor: unknown): valor is ErroApi {
  return Array.isArray(valor) && (valor as { __erroApi?: unknown }).__erroApi === true;
}

function deHttp(resposta: HttpErrorResponse, fallback: string): ErroApi {
  const corpo = resposta.error ?? null;

  const mensagens = deduplicar([
    ...extrairDeCorpo(corpo),
    ...(resposta.status === 0 ? ['Não foi possível conectar ao servidor.'] : []),
    ...(resposta.status === 401 ? ['Sessão expirada ou não autorizada.'] : []),
  ]);

  if (!mensagens.length) {
    const daMensagem = comoTexto(resposta.message);
    if (daMensagem) mensagens.push(daMensagem);
  }

  return criar(mensagens.length ? mensagens : [fallback], {
    origem: 'http',
    status: resposta.status ?? null,
    statusText: resposta.statusText ?? null,
    url: resposta.url ?? null,
    corpo,
    bruto: resposta,
  });
}

/**
 * Converte qualquer coisa lançada em um observable de erro num ErroApi.
 * Idempotente: se já for ErroApi, devolve o mesmo objeto.
 */
export function normalizarErro(origem: unknown, fallback: string = FALLBACK_PADRAO): ErroApi {
  if (ehErroApi(origem)) {
    return origem.length ? origem : criar([fallback], origem);
  }

  if (origem instanceof HttpErrorResponse) return deHttp(origem, fallback);

  if (origem instanceof Error) {
    const mensagens = deduplicar(extrairDeCorpo(origem.message));
    return criar(mensagens.length ? mensagens : [fallback], {
      origem: 'aplicacao',
      status: null,
      statusText: null,
      url: null,
      corpo: { name: origem.name, message: origem.message },
      bruto: origem,
    });
  }

  // Serviço que embrulha o HttpErrorResponse antes de relançar.
  if (origem !== null && typeof origem === 'object') {
    const objeto = origem as Record<string, unknown>;

    if (objeto['error'] instanceof HttpErrorResponse) {
      return deHttp(objeto['error'], fallback);
    }

    const temStatus = typeof objeto['status'] === 'number';
    const corpo = 'error' in objeto ? objeto['error'] : origem;
    const mensagens = deduplicar(extrairDeCorpo(corpo));

    return criar(mensagens.length ? mensagens : [fallback], {
      origem: temStatus ? 'http' : 'desconhecido',
      status: temStatus ? (objeto['status'] as number) : null,
      statusText:
        typeof objeto['statusText'] === 'string' ? (objeto['statusText'] as string) : null,
      url: typeof objeto['url'] === 'string' ? (objeto['url'] as string) : null,
      corpo,
      bruto: origem,
    });
  }

  const mensagens = deduplicar(extrairDeCorpo(origem));
  return criar(mensagens.length ? mensagens : [fallback], {
    origem: 'desconhecido',
    status: null,
    statusText: null,
    url: null,
    corpo: origem,
    bruto: origem,
  });
}

/** Leitor de mensagens com a mesma assinatura antiga. */
export function extrairMensagens(erro: unknown, fallback: string): string[] {
  return normalizarErro(erro, fallback);
}

/** 404 e 204 são ausência de registro, não falha de operação. */
export function semRegistro(erro: ErroApi): boolean {
  return erro.status === 404 || erro.status === 204;
}

/** Despeja o erro completo no console, em grupo recolhido. */
export function logErroApi(contexto: string, erro: ErroApi): void {
  const resumo = erro.length ? erro[0] : 'sem mensagem legível na resposta';

  console.groupCollapsed(`[API] ${contexto} · status ${erro.status ?? '-'} · ${resumo}`);
  console.error('resumo', {
    origem: erro.origem,
    status: erro.status,
    statusText: erro.statusText,
    url: erro.url,
    mensagens: [...erro],
  });
  console.error('corpo da resposta', erro.corpo);
  console.error('objeto original', erro.bruto);
  console.groupEnd();
}
