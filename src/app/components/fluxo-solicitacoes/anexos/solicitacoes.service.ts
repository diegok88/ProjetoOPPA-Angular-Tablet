import { inject, Injectable, signal } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../../../services/auth.service';
import {
  ContadorSolicitacoes,
  SolicitacaoForm,
  SolicitacoesModel,
  TipoSolicitacaoModel,
} from './solicitacoes.model';
import { environment } from '../../../constants/environment.const';
import {
  FiltroHistorico,
  PaginaHistorico,
} from '../../historico-solicitacoes/anexos/historico-solicitacoes.model';
import { buildSolicitacoesPayload } from './solicitacoes.params';

/* ==================== CONFIGURAÇÃO ==================== */

const NAMESPACE = 'solicitacoes';
const TIMEOUT_MS = 12000;
const TIMEOUT_ACK_OPCIONAL_MS = 6000;

/**
 * Janela de agrupamento.
 * Vários avisos dentro dela viram UM snack consolidado — é o que impede
 * três mensagens iguais quando o supervisor responde em sequência.
 */
const JANELA_AGRUPAMENTO_MS = 1500;

export const EVENTOS_SOLICITACAO = {
  criar: 'createSolicitacao',
  listarTipos: 'listarTiposSolicitacao',
  contar: 'contarSolicitacoes',
  responder: 'responderSolicitacao',
  cancelar: 'cancelarSolicitacao',
  reabrir: 'reabrirSolicitacao',
  marcarVisualizada: 'marcarSolicitacaoVisualizada',
  historico: 'findAllSolicitacoes',
  entrarNaTag: 'entrarNaTag',
} as const;

const MUTACOES = new Set<string>([
  EVENTOS_SOLICITACAO.criar,
  EVENTOS_SOLICITACAO.responder,
  EVENTOS_SOLICITACAO.cancelar,
  EVENTOS_SOLICITACAO.reabrir,
  EVENTOS_SOLICITACAO.marcarVisualizada,
]);

const ACK_OPCIONAL = new Set<string>([
  EVENTOS_SOLICITACAO.responder,
  EVENTOS_SOLICITACAO.cancelar,
  EVENTOS_SOLICITACAO.reabrir,
  EVENTOS_SOLICITACAO.marcarVisualizada,
]);

const DEBUG = true;

/* ==================== TIPOS ==================== */

/** `type` (não interface): aceita index signature implícita. */
export type EscopoSolicitacoes = {
  solicitanteId?: string;
  solicitadoId?: string;
  tagAtivoId?: string;
};

export type AcaoResposta = 'ACEITAR' | 'RECUSAR';

export interface ResponderSolicitacaoPayload {
  id: string;
  acao: AcaoResposta;
  solicitadoId?: string;
  observacao?: string;
}

const ACAO_NORMALIZADA: Record<string, AcaoResposta> = {
  ACEITAR: 'ACEITAR',
  ACEITA: 'ACEITAR',
  RECUSAR: 'RECUSAR',
  RECUSADA: 'RECUSAR',
};

/**
 * NOVA     — chegou uma solicitação PENDENTE para este posto.
 * RESPOSTA — o supervisor aceitou ou recusou.
 * MENSAGEM — nova observação do supervisor.
 */
export type TipoAvisoSolicitacao = 'NOVA' | 'RESPOSTA' | 'MENSAGEM';

export interface AvisoSolicitacao {
  /** null quando o aviso representa um lote (vários ids). */
  id: string | null;
  tipo: TipoAvisoSolicitacao;
  situacao: 'ACEITA' | 'RECUSADA' | null;
  /** Quem abriu a solicitação tem perfil de supervisor/gestão. */
  origemSupervisor: boolean;
  solicitanteId: string | null;
  solicitadoId: string | null;
  tagAtivoId: string | null;
  /** Quantas solicitações entraram neste aviso. */
  quantidade: number;
  /** Incrementa a cada aviso — garante disparo mesmo com texto repetido. */
  sequencia: number;
}

interface SolicitacaoEventoPayload {
  id?: string | null;
  situacao?: string | null;
  observacao?: string | null;
  solicitanteId?: string | null;
  solicitadoId?: string | null;
  tagAtivoId?: string | null;
  origemSupervisor?: boolean | null;
}

/** Estado anterior de uma solicitação, para detectar o que mudou. */
interface EstadoSolicitacao {
  situacao: string | null;
  observacao: string | null;
}

/** Item bruto acumulado antes de virar um aviso consolidado. */
interface ItemAviso {
  id: string;
  tipo: TipoAvisoSolicitacao;
  situacao: 'ACEITA' | 'RECUSADA' | null;
  origemSupervisor: boolean;
  solicitanteId: string | null;
  solicitadoId: string | null;
  tagAtivoId: string | null;
}

/** Situações que encerram a solicitação — não geram mais aviso. */
const SITUACOES_FINAIS = new Set(['ACEITA', 'RECUSADA', 'CANCELADA']);

/* ==================== SERVICE ==================== */

@Injectable({ providedIn: 'root' })
export class SolicitacaoService {
  private readonly auth = inject(AuthService);
  private socket: Socket | null = null;

  /** Tag do posto logado. Enviada ao back para entrar na sala correta. */
  private tagAtual: string | null = null;

  readonly conectado = signal(false);
  readonly contador = signal<ContadorSolicitacoes | null>(null);
  readonly avisoSolicitacao = signal<AvisoSolicitacao | null>(null);

  private readonly filas = new Map<string, Promise<unknown>>();

  /** Uma criação avisada por solicitação (pendente). */
  private readonly criadasAvisadas = new Set<string>();

  /** Uma resposta avisada por solicitação. */
  private readonly respostasAvisadas = new Set<string>();

  /** Último estado conhecido por solicitação. */
  private readonly estados = new Map<string, EstadoSolicitacao>();

  /** Fila de avisos aguardando a janela de agrupamento fechar. */
  private filaAvisos: ItemAviso[] = [];
  private timerLote?: ReturnType<typeof setTimeout>;

  /** Dedupe por chave: mesma solicitação + mesmo tipo não repete. */
  private readonly chavesAvisadas = new Set<string>();

  private sequenciaAviso = 0;

  /* ==================== CONEXÃO ==================== */

  conectar(): void {
    if (this.socket) return;

    const token = this.obterToken();
    if (!token) {
      if (DEBUG) console.warn('[socket] sem token — conexão abortada.');
      return;
    }

    this.socket = io(`${environment.apiUrl}/${NAMESPACE}`, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      this.conectado.set(true);
      if (DEBUG) console.log('[socket] conectado:', this.socket?.id);
      this.emitirEntradaTag();
    });

    this.socket.on('disconnect', (motivo) => {
      this.conectado.set(false);
      if (DEBUG) console.warn('[socket] desconectado:', motivo);
    });

    this.socket.on('connect_error', (erro) => {
      this.conectado.set(false);
      if (DEBUG) console.error('[socket] connect_error:', erro);
    });

    this.socket.on('solicitacaoContador', (c: ContadorSolicitacoes) => this.contador.set(c));

    if (DEBUG) {
      this.socket.onAny((evento, payload) => {
        console.log('[socket] recebido →', evento, payload);
      });
    }

    /* Pendentes: solicitação criada para este posto. */
    this.socket.on('solicitacaoCriada', (p: SolicitacaoEventoPayload) =>
      this.aoCriarSolicitacao(p),
    );

    /* Respostas e mensagens do supervisor. */
    this.socket.on('solicitacaoAtualizada', (p: SolicitacaoEventoPayload) =>
      this.aoAtualizarSolicitacao(p),
    );
  }

  desconectar(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.tagAtual = null;
    this.filas.clear();
    this.criadasAvisadas.clear();
    this.respostasAvisadas.clear();
    this.estados.clear();
    this.chavesAvisadas.clear();
    this.filaAvisos = [];
    clearTimeout(this.timerLote);
    this.avisoSolicitacao.set(null);
    this.conectado.set(false);
  }

  /* ==================== SALA DA TAG ==================== */

  entrarNaTag(tagAtivoId: string | null | undefined): void {
    const tag = tagAtivoId?.trim() || null;
    if (!tag) return;

    this.tagAtual = tag;
    this.emitirEntradaTag();
  }

  private emitirEntradaTag(): void {
    if (!this.tagAtual || !this.socket?.connected) return;

    this.socket.emit(
      EVENTOS_SOLICITACAO.entrarNaTag,
      { tagAtivoId: this.tagAtual },
      (r: { entrou?: boolean; sala?: string } | undefined) => {
        if (DEBUG) console.log('[socket] entrarNaTag ←', r);
      },
    );
  }

  /* ==================== AÇÕES ==================== */

  criar(dto: SolicitacaoForm): Observable<SolicitacoesModel> {
    return this.emitir<SolicitacoesModel>(EVENTOS_SOLICITACAO.criar, dto);
  }

  listarTipos(): Observable<TipoSolicitacaoModel[]> {
    return this.emitir<TipoSolicitacaoModel[]>(EVENTOS_SOLICITACAO.listarTipos, {});
  }

  contar(escopo?: EscopoSolicitacoes): Observable<ContadorSolicitacoes> {
    return this.emitir<ContadorSolicitacoes>(EVENTOS_SOLICITACAO.contar, this.limpar(escopo ?? {}));
  }

  responder(dto: ResponderSolicitacaoPayload): Observable<SolicitacoesModel> {
    if (!dto?.id) {
      return throwError(() => ({ message: 'Solicitação inválida.' }));
    }

    const acao = ACAO_NORMALIZADA[dto.acao];
    if (!acao) {
      return throwError(() => ({ message: 'Ação inválida para resposta.' }));
    }

    const corpo = this.limpar({
      id: dto.id,
      acao,
      solicitadoId: dto.solicitadoId,
      observacao: dto.observacao?.trim() || undefined,
    });

    if (DEBUG) console.log('[socket] responder payload →', corpo);

    return this.emitir<SolicitacoesModel>(EVENTOS_SOLICITACAO.responder, corpo);
  }

  aceitar(id: string, solicitadoId?: string, observacao?: string): Observable<SolicitacoesModel> {
    return this.responder({ id, acao: 'ACEITAR', solicitadoId, observacao });
  }

  recusar(id: string, solicitadoId?: string, observacao?: string): Observable<SolicitacoesModel> {
    return this.responder({ id, acao: 'RECUSAR', solicitadoId, observacao });
  }

  cancelar(id: string, solicitanteId?: string): Observable<SolicitacoesModel> {
    if (!id) return throwError(() => ({ message: 'Solicitação inválida.' }));

    return this.emitir<SolicitacoesModel>(
      EVENTOS_SOLICITACAO.cancelar,
      this.limpar({ id, solicitanteId }),
    );
  }

  reabrir(id: string): Observable<SolicitacoesModel> {
    if (!id) return throwError(() => ({ message: 'Solicitação inválida.' }));

    return this.emitir<SolicitacoesModel>(EVENTOS_SOLICITACAO.reabrir, { id });
  }

  marcarVisualizada(
    ids: string[],
    solicitadoId?: string,
    tagAtivoId?: string,
  ): Observable<{ marcadas: number }> {
    return this.emitir<{ marcadas: number }>(
      EVENTOS_SOLICITACAO.marcarVisualizada,
      this.limpar({ ids, solicitadoId, tagAtivoId }),
    );
  }

  /* ==================== HISTÓRICO ==================== */

  historico(filtro: FiltroHistorico): Observable<PaginaHistorico> {
    return this.emitir<PaginaHistorico>(
      EVENTOS_SOLICITACAO.historico,
      buildSolicitacoesPayload(filtro),
    );
  }

  /* ==================== AVISOS ==================== */

  /**
   * SOLICITAÇÃO PENDENTE criada.
   *
   * Avisa uma vez por id, sempre — inclusive quando quem criou foi o
   * supervisor (aí `origemSupervisor` vem true e o dashboard troca o texto).
   * O próprio posto é filtrado no dashboard (solicitanteId === meuId).
   */
  private aoCriarSolicitacao(payload: SolicitacaoEventoPayload | null): void {
    const id = payload?.id;
    if (!id) return;
    if (this.criadasAvisadas.has(id)) return;

    const situacao = payload?.situacao ?? 'PENDENTE';
    if (SITUACOES_FINAIS.has(situacao)) return;

    this.criadasAvisadas.add(id);

    this.enfileirarAviso({
      id,
      tipo: 'NOVA',
      situacao: null,
      origemSupervisor: payload?.origemSupervisor === true,
      solicitanteId: payload?.solicitanteId ?? null,
      solicitadoId: payload?.solicitadoId ?? null,
      tagAtivoId: payload?.tagAtivoId ?? null,
    });
  }

  /**
   * RESPOSTA e MENSAGEM.
   *
   * 1. RESPOSTA  — situação virou ACEITA/RECUSADA. Uma vez por id.
   * 2. MENSAGEM  — `observacao` mudou em relação ao último valor conhecido.
   *
   * Não exige conhecimento prévio do id: a primeira observação que chega já
   * dispara. Era esse `jaConhecida` que engolia a mensagem do supervisor.
   */
  private aoAtualizarSolicitacao(payload: SolicitacaoEventoPayload | null): void {
    const id = payload?.id;
    if (!id) return;

    const situacao = payload?.situacao ?? null;
    const observacao = this.normalizarTexto(payload?.observacao);

    const anterior = this.estados.get(id) ?? null;
    this.estados.set(id, { situacao, observacao });

    const observacaoMudou = !!observacao && observacao !== (anterior?.observacao ?? null);

    const ehResposta = situacao === 'ACEITA' || situacao === 'RECUSADA';

    const base = {
      id,
      origemSupervisor: payload?.origemSupervisor === true,
      solicitanteId: payload?.solicitanteId ?? null,
      solicitadoId: payload?.solicitadoId ?? null,
      tagAtivoId: payload?.tagAtivoId ?? null,
    };

    /* 1) Resposta — uma vez por solicitação. Respondidas não repetem. */
    if (ehResposta && !this.respostasAvisadas.has(id)) {
      this.respostasAvisadas.add(id);
      this.enfileirarAviso({ ...base, tipo: 'RESPOSTA', situacao });
      return;
    }

    /* 2) Nova mensagem do supervisor. */
    if (observacaoMudou && !SITUACOES_FINAIS.has(situacao ?? '')) {
      this.enfileirarAviso({
        ...base,
        tipo: 'MENSAGEM',
        situacao: ehResposta ? situacao : null,
      });
    }
  }

  /**
   * Acumula o aviso e reinicia a janela. Quando ela fecha, sai UM aviso
   * consolidado — três respostas seguidas viram "respondeu 3 solicitações".
   */
  private enfileirarAviso(item: ItemAviso): void {
    this.filaAvisos.push(item);

    clearTimeout(this.timerLote);
    this.timerLote = setTimeout(() => this.publicarLote(), JANELA_AGRUPAMENTO_MS);

    if (DEBUG) {
      console.log('[aviso] enfileirado →', item, '| fila:', this.filaAvisos.length);
    }
  }

  /** Consolida a fila em UM aviso, priorizando RESPOSTA > MENSAGEM > NOVA. */
  private publicarLote(): void {
    if (this.filaAvisos.length === 0) return;

    const itens = this.filaAvisos.splice(0, this.filaAvisos.length);

    const temResposta = itens.some((i) => i.tipo === 'RESPOSTA');
    const temMensagem = itens.some((i) => i.tipo === 'MENSAGEM');

    const tipo: TipoAvisoSolicitacao = temResposta ? 'RESPOSTA' : temMensagem ? 'MENSAGEM' : 'NOVA';

    const doTipo = itens.filter((i) => i.tipo === tipo);
    const primeiro = doTipo[0];

    /* Chave final: mesmo lote repetido não vira segundo snack. */
    const chave = `${tipo}|${doTipo
      .map((i) => i.id)
      .sort()
      .join(',')}`;
    if (this.chavesAvisadas.has(chave)) {
      if (DEBUG) console.log('[aviso] lote repetido ignorado →', chave);
      return;
    }
    this.chavesAvisadas.add(chave);

    this.sequenciaAviso += 1;

    const aviso: AvisoSolicitacao = {
      id: doTipo.length === 1 ? primeiro.id : null,
      tipo,
      situacao: primeiro.situacao,
      origemSupervisor: primeiro.origemSupervisor,
      solicitanteId: primeiro.solicitanteId,
      solicitadoId: primeiro.solicitadoId,
      tagAtivoId: primeiro.tagAtivoId,
      quantidade: doTipo.length,
      sequencia: this.sequenciaAviso,
    };

    this.avisoSolicitacao.set(aviso);

    if (DEBUG) console.log('[aviso] publicado →', aviso);
  }

  private normalizarTexto(valor: unknown): string | null {
    if (typeof valor !== 'string') return null;
    const texto = valor.trim();
    return texto ? texto : null;
  }

  /* ==================== TRANSPORTE ==================== */

  private emitir<T>(evento: string, payload?: unknown): Observable<T> {
    return from(this.enfileirar(evento, () => this.despachar<T>(evento, payload)));
  }

  private enfileirar<T>(evento: string, tarefa: () => Promise<T>): Promise<T> {
    const anterior = this.filas.get(evento) ?? Promise.resolve();
    const atual = anterior.catch(() => undefined).then(tarefa);

    this.filas.set(
      evento,
      atual.catch(() => undefined),
    );

    return atual;
  }

  private async despachar<T>(evento: string, payload?: unknown): Promise<T> {
    const socket = await this.socketPronto();
    const corpo = payload ?? {};
    const ackOpcional = ACK_OPCIONAL.has(evento);
    const capturarExcecao = MUTACOES.has(evento);

    if (DEBUG) {
      console.log('[socket] emit →', evento, corpo, '| conectado:', socket.connected);
    }

    return new Promise<T>((resolve, reject) => {
      let erroServidor: unknown = null;
      let finalizado = false;

      const aoErro = (pacote: unknown) => {
        erroServidor = pacote;
        if (DEBUG) console.warn('[socket] exception recebida em', evento, pacote);
      };

      const limite = ackOpcional ? TIMEOUT_ACK_OPCIONAL_MS : TIMEOUT_MS;

      const encerrar = () => {
        if (finalizado) return;
        finalizado = true;
        clearTimeout(temporizador);
        if (capturarExcecao) socket.off('exception', aoErro);
      };

      const temporizador = setTimeout(() => {
        encerrar();

        if (ackOpcional && !erroServidor) {
          if (DEBUG) {
            console.warn(`[socket] "${evento}" sem ack em ${limite}ms — seguindo otimista.`);
          }
          resolve({ ok: true } as T);
          return;
        }

        reject(
          erroServidor ?? {
            message: `Tempo esgotado no evento "${evento}".`,
          },
        );
      }, limite);

      if (capturarExcecao) socket.on('exception', aoErro);

      socket.emit(evento, corpo, (resposta: unknown) => {
        const erro = erroServidor;
        encerrar();

        if (erro) {
          reject(erro);
          return;
        }

        if (
          resposta &&
          typeof resposta === 'object' &&
          (resposta as { status?: string }).status === 'error'
        ) {
          reject(resposta);
          return;
        }

        if (DEBUG) console.log('[socket] ack ←', evento, resposta);
        resolve((resposta ?? { ok: true }) as T);
      });
    });
  }

  private async socketPronto(): Promise<Socket> {
    if (!this.socket) this.conectar();

    const socket = this.socket;
    if (!socket) {
      throw { message: 'Sem conexão com o servidor de solicitações.' };
    }
    if (socket.connected) return socket;

    await new Promise<void>((resolve, reject) => {
      const aoConectar = () => {
        clearTimeout(temporizador);
        resolve();
      };

      const temporizador = setTimeout(() => {
        socket.off('connect', aoConectar);
        reject({ message: 'Não foi possível conectar ao servidor de solicitações.' });
      }, TIMEOUT_MS);

      socket.once('connect', aoConectar);
      socket.connect();
    });

    return socket;
  }

  private limpar<T extends object>(corpo: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(corpo).filter(([, valor]) => valor !== undefined),
    ) as Partial<T>;
  }

  private obterToken(): string | null {
    const servico = this.auth as unknown as Record<string, unknown>;

    for (const nome of ['token', 'accessToken', 'obterToken', 'getToken']) {
      const valor = servico[nome];
      const bruto = typeof valor === 'function' ? (valor as () => unknown).call(this.auth) : valor;

      if (typeof bruto === 'string' && bruto) return bruto;
    }

    return null;
  }
}
