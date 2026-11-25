import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { StateDistribution } from '../../services/dashboard.service';
import { Charts } from '../../components/charts/charts';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AlocacaoOperacionalService } from '../../services/alocacao-operacional.service';
import { GeradorTurnoService } from '../../services/gerador-turno.service';
import { concatMap, distinctUntilChanged, filter, map, Observable, of } from 'rxjs';

import { NgClass } from '@angular/common';
import { ControleJornadaService } from '../../services/controle-jornada.service';
import {
  BOTAO_JORNADA,
  ControleJornadaModel,
  ControleJornadaQuery,
  proximoTipoJornada,
  TipoJornadaType,
} from '../../entities/controle-jornada.model';
import { formataDataLocal } from '../../util/formatar-data.util';
import { DialogFinalizarService } from '../../services/dialog-finalizar.service';
import {
  FINALIZAR_CANCELAR,
  FINALIZAR_ERRO,
  FINALIZAR_SUCESSO,
} from '../../entities/dialogo-finalizar.model';
import {
  CondicaoOcorrencia,
  OcorrenciaQuery,
} from '../../components/fluxo-ocorrencia/anexos/ocorrencia.model';
import { FalhasQuery } from '../../components/fluxo-ocorrencia/anexos/falhas.model';
import { FluxoOcorrenciaQuery } from '../../components/fluxo-ocorrencia/anexos/fluxo-ocorrencia.model';
import { FluxoOcorrencia } from '../../components/fluxo-ocorrencia/fluxo-ocorrencia';
import { DialogPinService } from '../../components/dialogo-pin/anexos/dialog-pin.service';
import { PIN_JORNADA } from '../../components/dialogo-pin/anexos/dialogo-pin.model';
import { FluxoSolicitacao } from '../../components/fluxo-solicitacoes/fluxo-solicitacoes';
import {
  AvisoSolicitacao,
  SolicitacaoService,
  TipoAvisoSolicitacao,
} from '../../components/fluxo-solicitacoes/anexos/solicitacoes.service';
import { OcorrenciaService } from '../../components/fluxo-ocorrencia/anexos/ocorrencia.service';
import { FluxoOcorrenciaService } from '../../components/fluxo-ocorrencia/anexos/fluxo-ocorrencia.service';
import { EstadoAtivoService } from '../../services/estado-ativo.service';

export interface HeaderMenuItem {
  label: string;
  icon: 'lock' | 'list' | 'logout';
}

export interface OperationalAction {
  label: string;
  icon: string;
  disabled?: boolean;
}

const QUERY = {
  CARREGAR_ALOCACAO: (tagAtivoId: string, turno: string) =>
    `tagAtivoId=${tagAtivoId}&condicao=ACEITO&turno=${turno}&status=${true}`,
  CARREGAR_JORNADA: (usuarioId: string, dataRegistro: string): ControleJornadaQuery => ({
    usuarioId: usuarioId,
    dataRegistro: dataRegistro,
    status: true,
    consulta: 'jornada_padrao',
  }),
  CARREGAR_OCORRENCIA: (estado: string): OcorrenciaQuery => ({
    estadoAtivoId: estado,
    condicaoOcorrencia: CondicaoOcorrencia.EXECUCAO.valor,
    status: true,
  }),
  CARREGAR_FALHA: (codigo: string): FalhasQuery => ({
    codigo: codigo,
    status: true,
    consulta: 'falhas_padrao',
  }),
  CARREGAR_FLUXO: (ocorrenciaId: string, dataInicial: string): FluxoOcorrenciaQuery => ({
    ocorrenciaId: ocorrenciaId,
    dataInicial: dataInicial,
    consulta: 'fluxo_parcial',
  }),
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [Charts, NgClass, FluxoOcorrencia, FluxoSolicitacao],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private destroyRef = inject(DestroyRef);
  private readonly dialogPin = inject(DialogPinService);
  private readonly finalizarService = inject(DialogFinalizarService);
  private readonly authService = inject(AuthService);
  private readonly alocacaoService = inject(AlocacaoOperacionalService);
  private readonly geradorTurnoService = inject(GeradorTurnoService);
  private readonly estadoAtivoService = inject(EstadoAtivoService);
  private readonly solicitacoesService = inject(SolicitacaoService);
  private readonly jornadaService = inject(ControleJornadaService);
  private readonly ocorrenciaService = inject(OcorrenciaService);
  private readonly fluxoOcorrenciaService = inject(FluxoOcorrenciaService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly menuOpen = signal(false);

  protected readonly terminal = this.authService.usuario;
  protected readonly alocacao = this.alocacaoService.buscarAlocacaoOperacional;
  protected readonly ocorrencia = this.ocorrenciaService.buscarOcorrencia;
  protected readonly turnoAtual = this.geradorTurnoService.buscarTurnoAtual;
  protected readonly ultimoRegistro = this.jornadaService.buscarControleJornada;
  protected readonly fluxoOcorrencia = this.fluxoOcorrenciaService.buscarFluxoOcorrencia;

  protected readonly registrando = signal(false);
  protected readonly fluxoFalhaAtivoCadastrar = signal(false);
  protected readonly fluxoFalhaAtivoExecutar = signal(false);
  protected readonly fluxoFalhaErro = signal(false);
  protected readonly feedback = signal<string | null>(null);

  protected readonly currentState = this.estadoAtivoService.currentState;
  protected readonly stateSince = this.estadoAtivoService.stateSince;
  protected readonly formattedDuration = this.estadoAtivoService.formattedDuration;
  protected readonly tipoEstadoAtual = this.estadoAtivoService.tipoEstadoAtual;

  /* ==================== SNACKBAR ==================== */

  /** Texto exibido no snack — null fecha. */
  protected readonly snackbarTexto = signal<string | null>(null);

  /** Tipo do snack aberto — evita reabrir com o mesmo conteúdo. */
  private snackbarTipo: TipoAvisoSolicitacao | null = null;

  /** Origem do lote aberto (só importa em NOVA). */
  private snackbarOrigemSupervisor = false;

  constructor() {
    toObservable(this.solicitacoesService.avisoSolicitacao)
      .pipe(
        filter((aviso): aviso is AvisoSolicitacao => !!aviso),
        takeUntilDestroyed(),
      )
      .subscribe((aviso) => this.tratarAviso(aviso));

    /** Declara a tag ao socket assim que ela existir. */
    toObservable(this.alocacao)
      .pipe(
        map((a) => a?.tagAtivoId ?? this.tagDoTerminal()),
        filter((tag): tag is string => !!tag),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((tag) => this.solicitacoesService.entrarNaTag(tag));
  }

  protected readonly proximoTipo = computed<TipoJornadaType>(() =>
    proximoTipoJornada(this.ultimoRegistro()),
  );

  protected readonly actions = computed<OperationalAction[]>(() => {
    const jornada = BOTAO_JORNADA[this.proximoTipo()] ?? BOTAO_JORNADA.ENTRADA_EXPEDIENTE;

    return [
      {
        label: jornada.label,
        icon: jornada.icon,
        disabled: this.registrando() || !this.terminal()?.tagAtivoId,
      },
      { label: 'Solicitar Supervisor', icon: 'supervisor' },
    ];
  });

  stateClass(tipoEstado: string): string {
    switch (tipoEstado) {
      case 'PRODUZINDO':
        return 'produzindo';
      case 'PARADA':
        return 'parado';
      case 'FALHA':
        return 'falha';
      default:
        return '';
    }
  }

  protected readonly distribuicaoEstados = computed<StateDistribution[]>(() => {
    const c = this.estadoAtivoService.contadorEstados();
    const total = c?.total ?? 0;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

    return [
      { label: 'Produzindo', color: '#22c55e', percent: pct(c?.produzindo ?? 0) },
      { label: 'Parado', color: '#eab308', percent: pct(c?.parado ?? 0) },
      { label: 'Falha', color: '#ef4444', percent: pct(c?.falha ?? 0) },
    ];
  });

  cardClass(tipoEstado: string): string {
    switch (tipoEstado) {
      case 'PRODUZINDO':
        return 'card-produzindo';
      case 'PARADA':
        return 'card-parado';
      case 'FALHA':
        return 'card-falha';
      default:
        return '';
    }
  }

  readonly headerMenuItems: HeaderMenuItem[] = [
    { label: 'Área Restrita', icon: 'lock' },
    { label: 'Histórico Solicitações', icon: 'list' },
    { label: 'Sair', icon: 'logout' },
  ];

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  onMenuItem(label: string): void {
    this.menuOpen.set(false);

    switch (label) {
      case 'Área Restrita':
        this.router.navigate(['/login']);
        break;

      case 'Histórico Solicitações':
        this.router.navigate(['/historico-solicitacoes'], {
          queryParams: { tagAtivoId: this.meuTagAtivoId() },
        });
        break;

      case 'Sair':
        this.sair();
        break;
    }
  }

  protected onAction(label: string): void {
    if (label === 'Solicitar Supervisor') {
      this.solicitarEncarregado();
      return;
    }
    this.registrarJornada();
  }

  /* Inicio cadastro de jornada ------------------------------------------------------------ */

  protected registrarJornada(): void {
    const alocacao = this.alocacao();
    const tipo = this.proximoTipo();

    if (!alocacao?.operadorId || !alocacao.tagAtivoId || this.registrando() || !tipo) {
      return;
    }

    const cracha = alocacao.operador?.cracha!;
    const empresa = this.terminal()?.empresaId!;
    const tagAtivoId = alocacao.tagAtivoId;
    const operadorNome = alocacao.operador?.nome;
    const jornada = BOTAO_JORNADA[tipo] ?? BOTAO_JORNADA.ENTRADA_EXPEDIENTE;
    const dados = operadorNome?.toUpperCase();

    this.registrando.set(true);
    this.feedback.set(null);

    this.dialogPin
      .abrir({
        ...PIN_JORNADA,
        usuario: operadorNome,
        acao: (pin) =>
          this.authService.autenticarAcao({ cracha: cracha, pin: pin, empresaId: empresa }),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((resultado) => {
        if (resultado === 'cancelado') {
          this.encerrarRegistro();
          this.finalizarService.finalizar({
            ...FINALIZAR_CANCELAR,
            operacao: jornada.message,
            dados,
          });
          return;
        }

        if (resultado === 'erro') {
          this.encerrarRegistro();
          this.finalizarService.finalizar({
            ...FINALIZAR_ERRO,
            operacao: jornada.message,
            dados,
            erros: this.finalizarService.ultimosErros(),
          });
          return;
        }

        this.cadastrarJornada({
          usuarioId: alocacao.operadorId!,
          tagAtivoId,
          tipo,
          operacao: jornada.message,
          dados,
        });
      });
  }

  private cadastrarJornada(config: {
    usuarioId: string;
    tagAtivoId: string;
    tipo: TipoJornadaType;
    operacao: string;
    dados?: string;
  }): void {
    this.jornadaService
      .cadastrar({
        usuarioId: config.usuarioId,
        tagAtivoId: config.tagAtivoId,
        tipoJornada: config.tipo,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.encerrarRegistro();
          this.posRegistrarJornada(config.tipo);
          this.finalizarService.finalizar({
            ...FINALIZAR_SUCESSO,
            operacao: config.operacao,
            dados: config.dados,
          });
        },
        error: (erro) => {
          const mensagem = erro?.error?.message;
          this.encerrarRegistro();
          this.finalizarService.finalizar({
            ...FINALIZAR_ERRO,
            operacao: config.operacao,
            dados: config.dados,
            erros: Array.isArray(mensagem) ? mensagem : mensagem ? [mensagem] : undefined,
          });
        },
      });
  }

  private posRegistrarJornada(tipo: TipoJornadaType): void {
    if (tipo === 'SAIDA_EXPEDIENTE') {
      this.jornadaService.limparBuscar();
      return;
    }
    this.sincronizarUltimoRegistro().subscribe({ error: () => {} });
  }

  private encerrarRegistro(): void {
    this.registrando.set(false);
  }

  private sincronizarUltimoRegistro(): Observable<ControleJornadaModel | null> {
    const usuario = this.alocacao()?.operadorId ?? undefined;
    const data = formataDataLocal(new Date());

    if (!usuario) return of(null);

    const query = QUERY.CARREGAR_JORNADA(usuario, data);
    return this.jornadaService.buscarUltimoRegistro(query);
  }

  /* Fim cadastro de jornada --------------------------------------------------------------- */

  private readonly falhaFluxo = viewChild.required<FluxoOcorrencia>('falhaFluxo');

  protected abrirModal(): void {
    this.falhaFluxo().disparar({ tipo: 'ABRIR' });
  }

  private readonly encarregadoFluxo = viewChild.required<FluxoSolicitacao>('encarregadoFluxo');

  protected solicitarEncarregado(): void {
    this.encarregadoFluxo().disparar({ tipo: 'ABRIR' });
  }

  onSupport(): void {
    console.log('Suporte técnico solicitado');
  }

  private sair(): void {
    this.estadoAtivoService.desconectar();
    this.solicitacoesService.desconectar();
    this.authService.logout().subscribe({
      next: () => this.irParaLogin(),
      error: () => this.irParaLogin(),
    });
  }

  private irParaLogin(): void {
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.menuOpen()) return;
    const wrapper = this.host.nativeElement.querySelector('.menu-wrapper');
    if (wrapper && !wrapper.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
  }

  ngOnInit(): void {
    this.estadoAtivoService.conectar();
    this.solicitacoesService.conectar();
    this.carregarPerfil();
  }

  private carregarPerfil(): void {
    this.authService
      .obterPerfil()
      .pipe(
        concatMap(() => this.carregarTurnoAtual()),
        concatMap(() => this.carregarAlocacao()),
        concatMap(() => this.sincronizarUltimoRegistro()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: () => this.router.navigate(['/login']),
      });
  }

  private carregarTurnoAtual() {
    return this.geradorTurnoService.buscarTurno();
  }

  private carregarAlocacao() {
    const usuario = this.terminal()?.tagAtivoId;
    const turno = this.turnoAtual()?.turno!;

    if (!usuario) return of(null);

    const query = QUERY.CARREGAR_ALOCACAO(usuario, turno);
    return this.alocacaoService.buscarAlocacao(query);
  }

  protected readonly historico = computed(() =>
    this.estadoAtivoService.historicoEstadoAtivo().map((e) => ({
      estado: e.tipoEstado,
      inicio: new Date(e.dataInicial).toLocaleTimeString('pt-BR'),
      termino: e.dataFinal ? new Date(e.dataFinal).toLocaleTimeString('pt-BR') : '--',
      duracao: this.formatarDuracao(e.duracao ?? 0),
    })),
  );

  protected formatarDuracao(segundos: number): string {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');

    return h > 0 ? `${h.toString().padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  /* ==================== SNACKBAR — AUXILIARES ==================== */

  private tagDoTerminal(): string | null {
    const doTerminal = (this.terminal() as { tagAtivoId?: string } | null | undefined)?.tagAtivoId;

    return doTerminal ?? null;
  }

  private meuTagAtivoId(): string | null {
    return this.alocacao()?.tagAtivoId ?? this.tagDoTerminal();
  }

  private meuUsuarioId(): string | null {
    const operadorId = this.alocacao()?.operadorId;
    if (operadorId) return operadorId;

    const terminal = this.terminal() as Record<string, unknown> | null | undefined;
    for (const chave of ['usuarioId', 'id', 'operadorId']) {
      const valor = terminal?.[chave];
      if (typeof valor === 'string' && valor) return valor;
    }

    return null;
  }

  private tagDoAviso(aviso: AvisoSolicitacao): string | null {
    const bruto = (aviso as AvisoSolicitacao & { tagAtivoId?: string | null }).tagAtivoId;

    return typeof bruto === 'string' && bruto ? bruto : null;
  }

  /** Texto do snack conforme o tipo do aviso. */
  private montarMensagem(aviso: AvisoSolicitacao): string {
    const quantidade = (aviso as AvisoSolicitacao & { quantidade?: number }).quantidade ?? 1;

    if (aviso.tipo === 'NOVA') {
      const doSupervisor =
        (aviso as AvisoSolicitacao & { origemSupervisor?: boolean }).origemSupervisor === true;

      if (doSupervisor) {
        return quantidade > 1
          ? `O supervisor enviou ${quantidade} novas solicitações.`
          : 'O supervisor enviou uma nova solicitação.';
      }

      return quantidade > 1
        ? `Você recebeu ${quantidade} novas solicitações.`
        : 'Você recebeu uma nova solicitação.';
    }

    if (aviso.tipo === 'RESPOSTA') {
      return 'O supervisor respondeu sua solicitação.';
    }

    return 'O supervisor enviou uma nova mensagem.';
  }

  /**
   * Regras de silêncio:
   *   NOVA              -> ignora se EU abri (solicitanteId === meuId);
   *   RESPOSTA/MENSAGEM -> ignora se EU respondi (solicitadoId === meuId).
   */
  private tratarAviso(aviso: AvisoSolicitacao): void {
    const minhaTag = this.meuTagAtivoId();
    const tagDoEvento = this.tagDoAviso(aviso);

    if (minhaTag && tagDoEvento && tagDoEvento !== minhaTag) return;

    const meuId = this.meuUsuarioId();

    if (aviso.tipo === 'NOVA') {
      if (meuId && aviso.solicitanteId === meuId) return;
    } else if (meuId && aviso.solicitadoId === meuId) {
      return;
    }

    this.exibirSnackbar(aviso);
  }

  /**
   * UM snack por vez, sem tempo de exibição.
   *
   * Se já existe um aberto do MESMO tipo, o novo aviso é IGNORADO — era
   * exatamente isso que fazia o card parecer abrir três vezes: cada evento
   * reescrevia o texto e forçava o re-render.
   * Tipo diferente substitui o conteúdo. Fecha apenas no clique do X.
   */
  private exibirSnackbar(aviso: AvisoSolicitacao): void {
    const aberto = this.snackbarTexto() !== null;

    if (aberto && this.snackbarTipo === aviso.tipo) return;

    this.snackbarTipo = aviso.tipo;
    this.snackbarOrigemSupervisor =
      (aviso as AvisoSolicitacao & { origemSupervisor?: boolean }).origemSupervisor === true;

    this.snackbarTexto.set(this.montarMensagem(aviso));
  }

  protected fecharSnackbar(): void {
    this.snackbarTexto.set(null);
    this.snackbarTipo = null;
    this.snackbarOrigemSupervisor = false;
  }
}
