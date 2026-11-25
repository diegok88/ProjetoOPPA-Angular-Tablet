import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import {
  CaixaHistorico,
  FILTRO_HISTORICO_INICIAL,
  FiltroHistorico,
  LinhaHistorico,
  OPCOES_RECORTE,
  OPCOES_SITUACAO,
  OPCOES_TAMANHO,
  PaginaHistorico,
  RecorteHistorico,
  RelacaoLinha,
  ROTULO_SITUACAO,
  StatusSolicitacao,
  TAMANHO_MAXIMO_PAGINA,
} from './anexos/historico-solicitacoes.model';
import { SolicitacaoService } from '../fluxo-solicitacoes/anexos/solicitacoes.service';
import { EscopoOperacionalService } from '../fluxo-solicitacoes/anexos/solicitacao-escopo.service';

/** Ação de linha — inclui cancelamento, que tem endpoint próprio. */
type AcaoLinha = 'ACEITAR' | 'RECUSAR' | 'CANCELAR';

/** Ações aceitas por `responderSolicitacao` (única fonte da verdade: back). */
type AcaoResposta = 'ACEITAR' | 'RECUSAR';

/** Caixa com escopo definido. `todas` é sempre tratada no cliente. */
type CaixaConsulta = 'recebidas' | 'enviadas';

interface BotaoAcao {
  acao: AcaoLinha;
  label: string;
  perigo: boolean;
}

/**
 * [CORRIGIDO] Espelha ResponderSolicitacoesDto do back.
 * O único campo que define a situação gravada é `acao`.
 * NÃO existe nem `situacao`, nem `status` neste payload.
 */
interface ResponderPayload {
  id: string;
  acao: AcaoResposta;
  solicitadoId?: string;
  observacao?: string;
}

const OBSERVACAO_MAX = 500;

@Component({
  selector: 'app-historico-solicitacoes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './historico-solicitacoes.html',
  styleUrl: './historico-solicitacoes.scss',
})
export class HistoricoSolicitacoes implements OnInit {
  private readonly service = inject(SolicitacaoService);
  private readonly escopo = inject(EscopoOperacionalService);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly linhas = signal<LinhaHistorico[]>([]);
  protected readonly total = signal(0);
  protected readonly paginaAtual = signal(1);
  protected readonly carregando = signal(false);
  protected readonly erroTexto = signal<string | null>(null);
  protected readonly processando = signal<string | null>(null);

  protected readonly filtro = signal<FiltroHistorico>({ ...FILTRO_HISTORICO_INICIAL });
  protected readonly alvo = signal<LinhaHistorico | null>(null);
  protected readonly acaoAtual = signal<AcaoLinha>('ACEITAR');
  protected readonly observacao = signal('');

  protected readonly opcoesRecorte = OPCOES_RECORTE;
  protected readonly opcoesSituacao = OPCOES_SITUACAO;
  protected readonly opcoesTamanho = OPCOES_TAMANHO;
  protected readonly limiteObservacao = OBSERVACAO_MAX;

  protected readonly dataReferencia = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  /** Cache da caixa "Todas", que é paginada localmente. */
  private todasLinhas: LinhaHistorico[] = [];

  private readonly operador$ = toObservable(this.escopo.operadorId);

  /** [NOVO] UUID canônico — o back valida com @IsUUID em id e solicitadoId. */
  private static readonly UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.total() / Math.max(1, this.filtro().size))),
  );

  protected readonly inicioRegistro = computed(() =>
    this.total() === 0 ? 0 : (this.paginaAtual() - 1) * this.filtro().size + 1,
  );

  protected readonly fimRegistro = computed(() =>
    Math.min(this.total(), this.paginaAtual() * this.filtro().size),
  );

  protected readonly temFiltroAtivo = computed(
    () => this.filtro().caixa !== 'todas' || !!this.filtro().desvios || !!this.filtro().situacao,
  );

  protected readonly tituloModal = computed(() => {
    switch (this.acaoAtual()) {
      case 'ACEITAR':
        return 'Aceitar solicitação';
      case 'RECUSAR':
        return 'Recusar solicitação';
      default:
        return 'Cancelar solicitação';
    }
  });

  protected readonly paginas = computed<(number | '…')[]>(() => {
    const ultima = this.totalPaginas();
    const atual = this.paginaAtual();
    if (ultima <= 7) return Array.from({ length: ultima }, (_, i) => i + 1);

    const lista: (number | '…')[] = [1];
    const inicio = Math.max(2, atual - 1);
    const fim = Math.min(ultima - 1, atual + 1);

    if (inicio > 2) lista.push('…');
    for (let p = inicio; p <= fim; p += 1) lista.push(p);
    if (fim < ultima - 1) lista.push('…');
    lista.push(ultima);

    return lista;
  });

  private readonly alteracao$ = new Subject<void>();
  private readonly marcados = new Set<string>();

  ngOnInit(): void {
    this.service.conectar();

    this.operador$
      .pipe(
        distinctUntilChanged(),
        switchMap((operadorId) => {
          if (!operadorId) return of(void 0);
          this.paginaAtual.set(1);
          this.marcados.clear();
          return this.carregar();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.alteracao$
      .pipe(
        debounceTime(300),
        switchMap(() => {
          this.paginaAtual.set(1);
          return this.carregar();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /* ==================== NAVEGAÇÃO ==================== */

  protected voltar(): void {
    this.location.back();
  }

  /* ==================== FILTROS ==================== */

  protected onCaixa(event: Event): void {
    const caixa = (event.target as HTMLSelectElement).value as CaixaHistorico;
    this.filtro.update((f) => ({ ...f, caixa }));
    this.alteracao$.next();
  }

  protected onRecorte(event: Event): void {
    const desvios = (event.target as HTMLSelectElement).value as RecorteHistorico;
    this.filtro.update((f) => ({ ...f, desvios }));
    this.alteracao$.next();
  }

  protected onSituacao(event: Event): void {
    const situacao = (event.target as HTMLSelectElement).value as StatusSolicitacao | '';
    this.filtro.update((f) => ({ ...f, situacao }));
    this.alteracao$.next();
  }

  protected limpar(): void {
    this.filtro.set({ ...FILTRO_HISTORICO_INICIAL });
    this.paginaAtual.set(1);
    this.marcados.clear();
    this.todasLinhas = [];
    this.carregar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected consultar(): void {
    this.marcados.clear();
    this.carregar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected trocarTamanho(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value) || 10;
    this.filtro.update((f) => ({ ...f, size: Math.min(size, TAMANHO_MAXIMO_PAGINA) }));
    this.paginaAtual.set(1);

    if (this.filtro().caixa === 'todas') {
      this.aplicarPaginaLocal();
      return;
    }

    this.carregar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  /* ==================== PAGINAÇÃO ==================== */

  protected anterior(): void {
    this.irPara(this.paginaAtual() - 1);
  }

  protected proxima(): void {
    this.irPara(this.paginaAtual() + 1);
  }

  protected irPara(pagina: number | '…'): void {
    if (pagina === '…') return;
    if (pagina < 1 || pagina > this.totalPaginas()) return;

    this.paginaAtual.set(pagina);

    if (this.filtro().caixa === 'todas') {
      this.aplicarPaginaLocal();
      return;
    }

    this.carregar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  /* ==================== AÇÕES ==================== */

  protected acoesLinha(linha: LinhaHistorico): BotaoAcao[] {
    if (linha.situacao !== 'PENDENTE') return [];

    if (this.relacaoDe(linha) === 'recebida') {
      return [
        { acao: 'RECUSAR', label: 'Recusar', perigo: true },
        { acao: 'ACEITAR', label: 'Aceitar', perigo: false },
      ];
    }

    return [{ acao: 'CANCELAR', label: 'Cancelar', perigo: true }];
  }

  protected executarAcao(linha: LinhaHistorico, acao: AcaoLinha): void {
    if (this.processando()) return;
    this.erroTexto.set(null);
    this.observacao.set('');
    this.acaoAtual.set(acao);
    this.alvo.set(linha);
  }

  protected fecharModal(): void {
    this.alvo.set(null);
    this.observacao.set('');
  }

  protected onObservacao(event: Event): void {
    const valor = (event.target as HTMLTextAreaElement).value;
    this.observacao.set(valor.slice(0, OBSERVACAO_MAX));
  }

  protected confirmar(): void {
    const alvo = this.alvo();
    if (!alvo || this.processando()) return;

    if (this.acaoAtual() === 'CANCELAR') {
      this.efetivarCancelamento(alvo);
      return;
    }

    this.efetivarResposta(alvo);
  }

  /* ==================== RESPOSTA (ACEITAR / RECUSAR) ==================== */

  /**
   * [CORRIGIDO]
   * O back grava a situação a partir de `acao` (REGRAS[acao].para):
   *   ACEITAR -> StatusSolicitacao.ACEITA
   *   RECUSAR -> StatusSolicitacao.RECUSADA
   *
   * Além disso, o gateway usa `dto.solicitadoId` como ATOR:
   *   const ator = extrairTexto(dto, 'solicitadoId') ?? user.userId;
   *   return this.solicitacoesService.responder(ator, dto);
   *
   * Se esse id não for exatamente `solicitacoes.solicitadoId`, o
   * validarAtor lança ForbiddenException e nada é gravado. Por isso a
   * resolução do id abaixo prioriza a FK plana (`alvo.solicitadoId`),
   * que é o valor real persistido.
   */
  private efetivarResposta(alvo: LinhaHistorico): void {
    const acao = this.acaoAtual();

    // Guarda real: 'CANCELAR' nunca deve chegar em responderSolicitacao.
    if (acao !== 'ACEITAR' && acao !== 'RECUSAR') {
      this.fecharModal();
      this.erroTexto.set('Ação inválida para responder esta solicitação.');
      return;
    }

    const solicitadoId = this.uuid(
      alvo.solicitadoId,
      alvo.solicitado?.usuarioId,
      alvo.solicitado?.operadorId,
      alvo.solicitado?.colaboradorId,
      alvo.solicitado?.id,
      this.escopo.operadorId(),
    );

    if (!solicitadoId) {
      this.fecharModal();
      this.erroTexto.set('Não foi possível identificar o operador desta solicitação.');
      return;
    }

    const observacao = this.observacao().trim();

    const payload: ResponderPayload = {
      id: alvo.id,
      acao,
      solicitadoId,
      ...(observacao ? { observacao } : {}),
    };

    this.processando.set(alvo.id);

    this.service
      .responder(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.finalizarSucesso(),
        error: (erro) => this.finalizarErro(erro, 'Não foi possível registrar a resposta.'),
      });
  }

  /* ==================== CANCELAMENTO ==================== */

  /**
   * [CORRIGIDO] Mesma lógica de ator, agora com `solicitanteId`.
   * Endpoint diferente (`cancelarSolicitacao`), então o payload também muda.
   */
  private efetivarCancelamento(alvo: LinhaHistorico): void {
    const solicitanteId = this.uuid(
      alvo.solicitanteId,
      alvo.solicitante?.usuarioId,
      alvo.solicitante?.operadorId,
      alvo.solicitante?.colaboradorId,
      alvo.solicitante?.id,
      this.escopo.operadorId(),
    );

    if (!solicitanteId) {
      this.fecharModal();
      this.erroTexto.set('Não foi possível identificar o operador que enviou a solicitação.');
      return;
    }

    this.processando.set(alvo.id);

    this.service
      .cancelar(alvo.id, solicitanteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.finalizarSucesso(),
        error: (erro) => this.finalizarErro(erro, 'Não foi possível cancelar a solicitação.'),
      });
  }

  /* ==================== FINALIZAÇÃO ==================== */

  private finalizarSucesso(): void {
    this.processando.set(null);
    this.fecharModal();
    this.marcados.clear();
    this.carregar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  private finalizarErro(erro: unknown, mensagem: string): void {
    console.error('[Histórico] erro na ação', erro);
    this.processando.set(null);
    this.fecharModal();
    // [NOVO] Mostra a mensagem do back (403/409/400) quando existir.
    this.erroTexto.set(this.mensagemDeErro(erro) ?? mensagem);
  }

  /* ==================== CARGA ==================== */

  private carregar(): Observable<void> {
    const operadorId = this.escopo.operadorId();

    if (!operadorId) {
      this.carregando.set(false);
      this.linhas.set([]);
      this.total.set(0);
      this.erroTexto.set('Operador não identificado na alocação nem na sessão.');
      return of(void 0);
    }

    this.carregando.set(true);
    this.erroTexto.set(null);

    const caixa = this.filtro().caixa;

    /**
     * "Todas" é mesclada no cliente. O back aplica AND entre solicitanteId e
     * solicitadoId, então mandar os dois devolve zero.
     */
    if (caixa === 'todas') {
      return forkJoin([this.consultarLado('recebidas'), this.consultarLado('enviadas')]).pipe(
        tap(([recebidas, enviadas]) => this.aplicarMescla(recebidas, enviadas)),
        map(() => void 0),
        catchError(() => this.tratarErroCarga()),
      );
    }

    // Aqui `caixa` já é 'recebidas' | 'enviadas' — explícito para o compilador.
    const lado: CaixaConsulta = caixa === 'recebidas' ? 'recebidas' : 'enviadas';

    return this.service.historico(this.montarFiltro(lado)).pipe(
      tap({
        next: (resposta) => this.aplicarRespostaUnica(resposta, lado),
        error: (erro) => console.error('[Histórico] erro ao consultar', erro),
      }),
      map(() => void 0),
      catchError(() => this.tratarErroCarga()),
    );
  }

  private consultarLado(caixa: CaixaConsulta): Observable<LinhaHistorico[]> {
    return this.service.historico(this.montarFiltro(caixa, 1, TAMANHO_MAXIMO_PAGINA)).pipe(
      map((resposta) => this.marcarRelacao(resposta?.dados ?? [], caixa)),
      catchError(() => of([] as LinhaHistorico[])),
    );
  }

  private aplicarMescla(recebidas: LinhaHistorico[], enviadas: LinhaHistorico[]): void {
    const vistos = new Set<string>();
    const mescladas: LinhaHistorico[] = [];

    for (const linha of [...recebidas, ...enviadas]) {
      if (vistos.has(linha.id)) continue;
      vistos.add(linha.id);
      mescladas.push(linha);
    }

    mescladas.sort((a, b) => this.tempo(b.dataEnvio) - this.tempo(a.dataEnvio));

    this.todasLinhas = mescladas;
    this.total.set(mescladas.length);
    this.aplicarPaginaLocal();
    this.carregando.set(false);
    this.marcarComoLidas(mescladas);
  }

  private aplicarPaginaLocal(): void {
    const size = Math.max(1, this.filtro().size);
    const inicio = (this.paginaAtual() - 1) * size;
    this.linhas.set(this.todasLinhas.slice(inicio, inicio + size));
  }

  private aplicarRespostaUnica(resposta: PaginaHistorico, caixa: CaixaConsulta): void {
    const dados = this.marcarRelacao(resposta?.dados ?? [], caixa);
    this.todasLinhas = [];
    this.linhas.set(dados);
    this.total.set(resposta?.total ?? 0);
    this.carregando.set(false);
    this.marcarComoLidas(dados);
  }

  private tratarErroCarga(): Observable<void> {
    this.carregando.set(false);
    this.erroTexto.set('Falha ao carregar o histórico de hoje.');
    return of(void 0);
  }

  private montarFiltro(
    caixa: CaixaHistorico,
    page = this.paginaAtual(),
    size = this.filtro().size,
  ): FiltroHistorico {
    const operadorId = this.escopo.operadorId();
    const situacao = this.filtro().situacao;

    const tagAtivoId = this.resolverTagAtivoId();

    return {
      ...this.filtro(),
      caixa,
      solicitanteId: caixa === 'recebidas' ? '' : operadorId,
      solicitadoId: caixa === 'enviadas' ? '' : operadorId,
      tagAtivoId,
      situacao,
      situacoes: situacao ? [situacao] : [],
      page,
      size: Math.min(size, TAMANHO_MAXIMO_PAGINA),
    };
  }

  private resolverTagAtivoId(): string {
    const doEscopo = this.escopo.tagAtivoId();
    if (doEscopo) return doEscopo;

    const daUrl = new URLSearchParams(window.location.search).get('tagAtivoId');
    if (daUrl) return daUrl;

    const doStorage = sessionStorage.getItem('tagAtivoId') ?? localStorage.getItem('tagAtivoId');
    if (doStorage) return doStorage;

    return '';
  }

  /* ==================== RELAÇÃO E LEITURA ==================== */

  private marcarRelacao(linhas: LinhaHistorico[], caixa: CaixaConsulta): LinhaHistorico[] {
    const relacao: RelacaoLinha = caixa === 'recebidas' ? 'recebida' : 'enviada';
    return linhas.map((linha) => ({ ...linha, relacao }));
  }

  protected relacaoDe(linha: LinhaHistorico): RelacaoLinha {
    return linha.relacao ?? (this.filtro().caixa === 'enviadas' ? 'enviada' : 'recebida');
  }

  private marcarComoLidas(dados: LinhaHistorico[]): void {
    const pendentes = dados.filter(
      (linha) =>
        this.relacaoDe(linha) === 'recebida' &&
        linha.situacao === 'PENDENTE' &&
        !linha.dataVisualizacao &&
        !this.marcados.has(linha.id),
    );

    if (!pendentes.length) return;

    const ids = pendentes.map((linha) => linha.id);
    ids.forEach((id) => this.marcados.add(id));

    const agora = new Date().toISOString();

    /**
     * [CORRIGIDO] O back filtra por `solicitadoId: alvo` no updateMany.
     * Mandar o id da relação (que pode ser colaborador/operador) faz o
     * updateMany casar zero linhas e as não-visualizadas nunca zerarem.
     */
    const solicitadoId = this.uuid(
      pendentes[0].solicitadoId,
      pendentes[0].solicitado?.usuarioId,
      pendentes[0].solicitado?.operadorId,
      pendentes[0].solicitado?.colaboradorId,
      pendentes[0].solicitado?.id,
      this.escopo.operadorId(),
    );

    this.service
      .marcarVisualizada(ids, solicitadoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.linhas.update((atuais) =>
            atuais.map((linha) =>
              ids.includes(linha.id) ? { ...linha, dataVisualizacao: agora } : linha,
            ),
          );
        },
        error: () => ids.forEach((id) => this.marcados.delete(id)),
      });
  }

  /* ==================== APRESENTAÇÃO ==================== */

  protected tituloLinha(linha: LinhaHistorico): string {
    return linha.tipoSolicitacao?.descricao ?? 'Solicitação';
  }

  protected pessoaDe(linha: LinhaHistorico): string {
    return this.relacaoDe(linha) === 'recebida'
      ? linha.solicitante?.nome ?? 'Não informado'
      : linha.solicitado?.nome ?? 'Não informado';
  }

  protected crachaDe(linha: LinhaHistorico): string | null {
    return this.relacaoDe(linha) === 'recebida'
      ? linha.solicitante?.cracha ?? null
      : linha.solicitado?.cracha ?? null;
  }

  protected nomeTag(linha: LinhaHistorico): string {
    return linha.tagAtivo?.descricao ?? '—';
  }

  protected classeSituacao(situacao: StatusSolicitacao): string {
    return `situacao situacao-${situacao}`;
  }

  protected rotuloSituacao(situacao: StatusSolicitacao): string {
    return ROTULO_SITUACAO[situacao] ?? situacao;
  }

  protected formatarData(valor?: string | null): string {
    if (!valor) return '—';

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return '—';

    const partes = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Sao_Paulo',
    }).formatToParts(data);

    const pegar = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
    return `${pegar('day')}/${pegar('month')} ${pegar('hour')}:${pegar('minute')}`;
  }

  /* ==================== UTILITÁRIOS ==================== */

  private tempo(valor?: string | null): number {
    const data = new Date(valor ?? '');
    return Number.isNaN(data.getTime()) ? 0 : data.getTime();
  }

  private texto(...valores: unknown[]): string {
    for (const valor of valores) {
      if (typeof valor === 'string' && valor.trim()) return valor.trim();
      if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
    }
    return '';
  }

  /**
   * [NOVO] Primeiro valor com cara de UUID válido.
   * Evita 400 do @IsUUID('all') no `solicitadoId` do DTO.
   */
  private uuid(...valores: unknown[]): string | undefined {
    for (const valor of valores) {
      const bruto = this.texto(valor);
      if (bruto && HistoricoSolicitacoes.UUID.test(bruto)) return bruto;
    }
    return undefined;
  }

  /** [NOVO] Extrai `message` do erro HTTP para exibir o motivo real. */
  private mensagemDeErro(erro: unknown): string | null {
    if (!erro || typeof erro !== 'object') return null;

    const corpo = erro as {
      error?: { message?: string | string[] };
      message?: string;
    };

    const bruto = corpo.error?.message ?? corpo.message;
    if (Array.isArray(bruto)) return bruto.join(' ');
    if (typeof bruto === 'string' && bruto.trim()) return bruto.trim();

    return null;
  }
}
