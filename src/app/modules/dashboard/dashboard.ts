import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  Inject,
  inject,
  OnInit,
  resource,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { StateDistribution } from '../../services/dashboard.service';
import { Charts } from '../../components/charts/charts';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlocacaoOperacionalService } from '../../services/alocacao-operacional.service';
import { GeradorTurnoService } from '../../services/gerador-turno.service';
import { concatMap, EMPTY, Observable, of, tap } from 'rxjs';
import { EstadoAtivoService } from '../../services/estado-ativo.service';
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
import { DialogPinService } from '../../services/dialog-pin.service';
import {
  PIN_CADASTRO_FALHA,
  PIN_INICIAR_FLUXO,
  PIN_JORNADA,
} from '../../entities/dialogo-pin.model';
import { DialogFinalizarService } from '../../services/dialog-finalizar.service';
import {
  FINALIZAR_CANCELADO_RETORNO,
  FINALIZAR_CANCELAR,
  FINALIZAR_ERRO,
  FINALIZAR_ERRO_RETORNO,
  FINALIZAR_INICIAR_RETORNO,
  FINALIZAR_SUCESSO,
  FINALIZAR_SUCESSO_RETORNO,
  ResultadoFinalizar,
} from '../../entities/dialogo-finalizar.model';
import {
  CondicaoOcorrencia,
  OcorrenciaForm,
  OcorrenciaModel,
  OcorrenciaQuery,
} from '../../entities/ocorrencia.model';
import { OcorrenciaService } from '../../services/ocorrencia.service';
import { DialogInputService } from '../../services/dialog-input.service';
import { INPUT_CODIGO_FALHA } from '../../entities/dialogo-input.model';
import { DialogConfirmarService } from '../../services/dialog-confirmar.service';
import { FalhasModel, FalhasQuery } from '../../entities/falhas.model';
import { FalhasService } from '../../services/falhas.service';
import { extrairMensagens } from '../../util/error-api.util';
import {
  CONFIRMAR_CADASTRAR,
  CONFIRMAR_INICIAR_FLUXO,
} from '../../entities/dialogo-confirmar.model';
import { DialogFinalizarRetornoService } from '../../services/dialog-finalizar-retorno.service';
import {
  FluxoOcorrenciaForm,
  FluxoOcorrenciaModel,
  FluxoOcorrenciaQuery,
} from '../../entities/fluxo-ocorrencia.model';
import { FluxoOcorrenciaService } from '../../services/fluxo-ocorrencia.service';

export interface HeaderMenuItem {
  label: string;
  icon: 'lock' | 'list' | 'logout';
}

export interface OperationalAction {
  label: string;
  icon: string;
  disabled?: boolean;
}

/** Contexto imutável do fluxo de falha, circula entre todas as etapas. */
interface ContextoFalha {
  ocorrencia: OcorrenciaModel;
  ocorrenciaId: string;
}

/** Contexto após a resolução do código: adiciona os dados da falha. */
interface ContextoFalhaResolvida extends ContextoFalha {
  codigo: string;
  falha: FalhasModel;
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
  imports: [Charts, NgClass],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private destroyRef = inject(DestroyRef);

  private readonly dialogPin = inject(DialogPinService);
  private readonly confirmarService = inject(DialogConfirmarService);
  private readonly finalizarService = inject(DialogFinalizarService);
  private readonly finalizarRetornoService = inject(DialogFinalizarRetornoService);
  private readonly inputService = inject(DialogInputService);

  private readonly authService = inject(AuthService);
  private readonly alocacaoService = inject(AlocacaoOperacionalService);
  private readonly geradorTurnoService = inject(GeradorTurnoService);
  private readonly estadoAtivoService = inject(EstadoAtivoService);
  private readonly jornadaService = inject(ControleJornadaService);
  private readonly ocorrenciaService = inject(OcorrenciaService);
  private readonly falhaService = inject(FalhasService);
  private readonly fluxoOcorrenciaService = inject(FluxoOcorrenciaService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Menu aberto pelo botão hambúrguer do cabeçalho */
  readonly menuOpen = signal(false);
  protected readonly usuario = this.authService.usuario;
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

  // Fonte em tempo real do estado da máquina
  private readonly identification = this.estadoAtivoService.identificationState;
  protected readonly currentState = this.estadoAtivoService.currentState;
  protected readonly stateSince = this.estadoAtivoService.stateSince;
  protected readonly formattedDuration = this.estadoAtivoService.formattedDuration;
  protected readonly tipoEstadoAtual = this.estadoAtivoService.tipoEstadoAtual;

  /** Próximo registro do ciclo, derivado do último cadastro do usuário */
  protected readonly proximoTipo = computed<TipoJornadaType>(() =>
    proximoTipoJornada(this.ultimoRegistro()),
  );

  /** Ações operacionais: botão de jornada dinâmico + Solicitar Encarregado */
  protected readonly actions = computed<OperationalAction[]>(() => {
    const jornada = BOTAO_JORNADA[this.proximoTipo()] ?? BOTAO_JORNADA.ENTRADA_EXPEDIENTE;
    return [
      {
        label: jornada.label,
        icon: jornada.icon,
        disabled: this.registrando() || !this.usuario()?.tagAtivoId,
      },
      { label: 'Solicitar Encarregado', icon: 'supervisor' },
    ];
  });

  /** Classe do TEXTO do estado (bate com .state-text no SCSS) */
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
  /* Inicio retorno do grafico-----------------------------------------------------------------------------------------------------------------------------------------------------*/
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
  /* Fim retorno do grafico-----------------------------------------------------------------------------------------------------------------------------------------------------*/
  /** Classe do CARD (borda/realce por estado, bate com .card-produzindo etc.) */
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
        this.router.navigate(['/login']);
        break;
      case 'Sair':
        this.sair();
        break;
    }
  }

  protected onAction(label: string): void {
    if (label === 'Solicitar Encarregado') {
      this.solicitarEncarregado();
      return;
    }

    this.registrarJornada();
  }

  /* Inicio cadastro de jornada-----------------------------------------------------------------------------------------------------------------------------------------------------*/
  protected registrarJornada(): void {
    const alocacao = this.alocacao();
    const tipo = this.proximoTipo();
    if (!alocacao?.operadorId || !alocacao.tagAtivoId || this.registrando() || !tipo) return;

    const operadorId = alocacao.operadorId;
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
        acao: (pin) => this.authService.autenticarAcao({ usuarioId: operadorId, pin }),
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
          usuarioId: operadorId,
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
  /* Fim cadastro de jornada-----------------------------------------------------------------------------------------------------------------------------------------------------*/
  /* Inicio cadastro de ocorrência-----------------------------------------------------------------------------------------------------------------------------------------------------*/

  protected abrirModal() {
    if (this.tipoEstadoAtual() !== 'FALHA') return;
    const estado = this.identification();

    const queryO = QUERY.CARREGAR_OCORRENCIA(estado);
    this.carregarOcorrencia(queryO)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        concatMap(() => this.carregarFluxoOcorrencia()),
      )
      .subscribe({
        next: () => {
          const ocorrencia = this.ocorrencia();
          const fluxo = this.fluxoOcorrencia();
          if (ocorrencia && !ocorrencia.falhaId) {
            this.solicitarCodigo({ ocorrencia: ocorrencia, ocorrenciaId: ocorrencia.id });
          } else if (fluxo) {
            console.log(fluxo);
            this.confirmarInicioFluxo(fluxo);
          }
        },
        error: (erro) => this.finalizarErro(erro, 'Falha ao carregar ocorrência'),
      });
  }
  /** GATILHO: estado FALHA → localiza a ocorrência em EXECUCAO e abre a etapa 1. */
  private readonly alertaFalha = effect(() => {
    if (this.tipoEstadoAtual() !== 'FALHA') return;

    const tag = this.usuario()?.nome!;
    const estado = this.identification();
    if (!estado) {
      this.encerrarFluxoFalhaCadastrar();
      return;
    }

    const queryO = QUERY.CARREGAR_OCORRENCIA(estado);
    this.carregarOcorrencia(queryO)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        concatMap(() => this.carregarFluxoOcorrencia()),
      )

      .subscribe({
        next: () => {
          const ocorrencia = this.ocorrencia();
          const fluxo = this.fluxoOcorrencia();
          if (ocorrencia && !ocorrencia.falhaId) {
            this.solicitarCodigo({ ocorrencia: ocorrencia, ocorrenciaId: ocorrencia.id });
          } else if (fluxo) {
            console.log(fluxo);
            this.confirmarInicioFluxo(fluxo);
          }
        },
        error: (erro) => this.finalizarErro(erro, 'Cadastrar Falha', tag),
      });
  });

  /** Etapa 1: input do código. Sem acao, o fechamento devolve a string digitada. */
  private solicitarCodigo(ctx: ContextoFalha): void {
    this.iniciarFluxoFalhaCadastar();
    this.inputService
      .abrir({ ...INPUT_CODIGO_FALHA })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((resultado) => {
        const codigo =
          typeof resultado === 'string' && resultado !== 'cancelado' ? resultado.trim() : null;

        if (codigo) {
          this.resolverFalha(codigo, ctx);
        } else {
          this.encerrarFluxoFalhaCadastrar();
        }
      });
  }

  /** Etapa 2: busca a falha pelo código no banco. Sem match, volta ao input. */
  private resolverFalha(codigo: string, ctx: ContextoFalha): void {
    const query = QUERY.CARREGAR_FALHA(codigo);

    this.carregarFalha(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resposta) => {
          const falha = Array.isArray(resposta) ? resposta[0] : resposta;
          this.confirmarFalha({ ...ctx, codigo, falha });
        },
        error: (erro) => {
          this.finalizarErro(erro, 'Cadastrar Falha', codigo)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.solicitarCodigo(ctx);
            });
        },
      });
  }

  /** Etapa 3: confirmação exibindo a falha descrita. Ação no-op: a gravação acontece após o PIN. */
  private confirmarFalha(ctxResolvida: ContextoFalhaResolvida): void {
    const dados = this.descreverFalha(ctxResolvida.codigo, ctxResolvida.falha);
    this.confirmarService
      .confirmar({
        ...CONFIRMAR_CADASTRAR,
        titulo: 'Registrar Falha',
        entidade: 'falha',
        dados: dados,
        acao: () => of(true),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((resultado) => {
        if (resultado === 'finalizado') {
          this.solicitarPin(ctxResolvida);
        } else {
          this.finalizarCancelado('Cadastrar Falha', dados)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.solicitarCodigo(ctxResolvida);
            });
        }
      });
  }

  /** Etapa 4: PIN. A acao valida o PIN contra o backend. */
  private solicitarPin(ctxResolvida: ContextoFalhaResolvida): void {
    const alocacao = this.alocacao();
    if (!alocacao?.operadorId || this.registrando()) return;

    const operadorId = alocacao.operadorId;
    const operadorNome = alocacao.operador?.nome;

    this.dialogPin
      .abrir({
        ...PIN_CADASTRO_FALHA,
        usuario: operadorNome,
        acao: (pin) => this.authService.autenticarAcao({ usuarioId: operadorId, pin }),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((resultado) => {
        if (resultado === 'finalizado') {
          this.registrarFalha(ctxResolvida);
        } else {
          this.solicitarCodigo(ctxResolvida);
        }
      });
  }

  /** Etapa 5: grava o id da falha na ocorrência e finaliza. */
  private registrarFalha(ctxResolvida: ContextoFalhaResolvida): void {
    const atualizar: OcorrenciaForm = { falhaId: ctxResolvida.falha.id };
    const ocorrenciaId = ctxResolvida.ocorrenciaId;
    const dados = `${ctxResolvida.falha.codigo} - ${ctxResolvida.falha.descricao}`;

    this.ocorrenciaService
      .atualizar(ocorrenciaId, atualizar)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.finalizarSucesso('Cadastrar Falha', dados)
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              concatMap(() => this.carregarFluxoOcorrencia()),
            )
            .subscribe(() => {
              const fluxo = this.fluxoOcorrencia();
              if (fluxo) {
                this.confirmarInicioFluxo(fluxo);
              }
            });
        },
        error: (erro: unknown) => {
          this.finalizarErro(erro, 'Cadastrar Falha', dados)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.solicitarCodigo(ctxResolvida);
            });
        },
      });
  }

  /** Etapa 6: confirmação exibindo a verificação do ativo. Ação no-op: a gravação acontece após o PIN. */
  private confirmarInicioFluxo(fluxo: FluxoOcorrenciaModel): void {
    const perfil = fluxo.transferidoPerfil?.descricao;
    if (perfil === 'OPERADOR') {
      this.confirmarService
        .confirmar({
          ...CONFIRMAR_INICIAR_FLUXO,
          entidade: 'ativo,',
          dados: perfil,
          acao: () => of(true),
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((resultado) => {
          const usuario = this.alocacao();
          if (resultado === 'finalizado' && usuario?.operadorId) {
            this.solicitarPinVerificar(usuario.operadorId, fluxo);
          } else {
            this.finalizarCancelado('Início da verificação', perfil)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe(() => {
                error: () => {};
              });
          }
        });
    }
  }

  /** Etapa 7: PIN. A acao valida o PIN contra o backend. */
  private solicitarPinVerificar(usuarioId: string, fluxo: FluxoOcorrenciaModel): void {
    const alocacao = this.alocacao();
    if (!alocacao?.operadorId || this.registrando()) return;

    const operadorId = alocacao.operadorId;
    const operadorNome = alocacao.operador?.nome;

    this.dialogPin
      .abrir({
        ...PIN_INICIAR_FLUXO,
        usuario: operadorNome,
        acao: (pin) => this.authService.autenticarAcao({ usuarioId: operadorId, pin }),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((resultado) => {
        if (resultado === 'finalizado') {
          this.registrarFluxoOcorrencia(usuarioId, fluxo);
        } else {
          this.confirmarInicioFluxo(fluxo);
        }
      });
  }

  /** Etapa 8: Registro do usuario no fluxo da ocorrencia. */
  private registrarFluxoOcorrencia(usuarioId: string, fluxo: FluxoOcorrenciaModel) {
    const fluxoId = fluxo.id;
    const atualizar: FluxoOcorrenciaForm = { usuarioId: usuarioId };
    const perfil = fluxo.transferidoPerfil?.descricao;

    this.fluxoOcorrenciaService
      .atualizar(fluxoId, atualizar)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.finalizarSucesso('Cadastro da Verificação', perfil!)
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              concatMap(() => this.carregarFluxoOcorrencia()),
            )
            .subscribe(() => {
              const fluxo = this.fluxoOcorrencia();
              if (fluxo) {
                this.confirmarBloqueioFluxo(fluxo);
              }
            });
        },
        error: (erro: unknown) => {
          this.finalizarErro(erro, 'Cadastrar da Verificação', perfil!)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.confirmarInicioFluxo(fluxo);
            });
        },
      });
  }

  /** Etapa 8: Modal de bloqueio. */
  private confirmarBloqueioFluxo(fluxo: FluxoOcorrenciaModel): void {
    const perfil = fluxo.transferidoPerfil?.descricao;
    if (perfil === 'OPERADOR') {
      this.confirmarService
        .confirmar({
          ...CONFIRMAR_INICIAR_FLUXO,
          entidade: 'ativo,',
          dados: perfil,
          acao: () => of(true),
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((resultado) => {
          const usuario = this.alocacao();
          if (resultado === 'finalizado' && usuario?.operadorId) {
            this.solicitarPinVerificar(usuario.operadorId, fluxo);
          } else {
            this.finalizarCancelado('Início da verificação', perfil)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe(() => {
                error: () => {};
              });
          }
        });
    }
  }

  /** Monta o texto "código + descrição" exibido na confirmação e na finalização. */
  private descreverFalha(codigo: string, falha: FalhasModel): string {
    const descricao = (falha as any).descricao ?? (falha as any).nome ?? '';
    return descricao ? `código ${codigo}: ${descricao}` : `código ${codigo}`;
  }

  protected modalIniciarFluxo(operacao: string, dados: string): Observable<ResultadoFinalizar> {
    return this.finalizarRetornoService.finalizar({
      ...FINALIZAR_INICIAR_RETORNO,
      operacao,
      dados,
      acao: () => of(true),
    });
  }

  protected finalizarSucesso(operacao: string, dados: string): Observable<ResultadoFinalizar> {
    return this.finalizarRetornoService.finalizar({
      ...FINALIZAR_SUCESSO_RETORNO,
      operacao,
      dados,
      acao: () => of(true),
    });
  }

  private finalizarCancelado(operacao: string, dados: string): Observable<ResultadoFinalizar> {
    return this.finalizarRetornoService.finalizar({
      ...FINALIZAR_CANCELADO_RETORNO,
      operacao,
      dados,
      acao: () => of(true),
    });
  }

  protected finalizarErro(
    erro: unknown,
    operacao: string,
    dados?: string,
  ): Observable<ResultadoFinalizar> {
    return this.finalizarRetornoService.finalizar({
      ...FINALIZAR_ERRO_RETORNO,
      operacao,
      dados,
      erros: extrairMensagens(erro, 'Não foi possível confirmar a operação.'),
      acao: () => of(true),
    });
  }

  private iniciarFluxoFalhaCadastar(): void {
    this.fluxoFalhaAtivoCadastrar.set(true);
  }
  private encerrarFluxoFalhaCadastrar(): void {
    this.fluxoFalhaAtivoCadastrar.set(false);
  }

  private carregarOcorrencia(query: OcorrenciaQuery) {
    return this.ocorrenciaService.buscar(query);
  }

  private carregarFalha(query: FalhasQuery) {
    return this.falhaService.buscar(query);
  }

  private carregarFluxoOcorrencia() {
    const ocorrencia = this.ocorrencia();
    if (!ocorrencia) return EMPTY;
    const data = formataDataLocal(new Date());
    const query = QUERY.CARREGAR_FLUXO(ocorrencia.id, data);
    return this.fluxoOcorrenciaService.buscar(query);
  }
  /* Fim cadastro de ocorrência-----------------------------------------------------------------------------------------------------------------------------------------------------*/

  protected solicitarEncarregado(): void {
    console.log('Solicitação do encarregado enviada');
  }

  onSupport(): void {
    console.log('Suporte técnico solicitado');
  }

  private sair(): void {
    this.estadoAtivoService.desconectar();
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
    const usuario = this.usuario()?.tagAtivoId;
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
  /* Formata o tempo no card  do estado da máquina */
  protected formatarDuracao(segundos: number): string {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');
    return h > 0 ? `${h.toString().padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
  }
}
