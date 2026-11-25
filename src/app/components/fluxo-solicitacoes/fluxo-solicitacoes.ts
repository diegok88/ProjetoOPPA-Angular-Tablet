import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  defaultIfEmpty,
  defer,
  map,
  Observable,
  of,
  switchMap,
  throwError,
  timeout,
} from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AlocacaoOperacionalService } from '../../services/alocacao-operacional.service';
import { DialogConfirmarService } from '../dialogo-confimar/anexos/dialog-confirmar.service';
import {
  PresetConfirmar,
  SOLICITACAO_CONFIRMAR_ENVIO,
} from '../dialogo-confimar/anexos/dialogo-confirmar.model';
import {
  PresetFinalizar,
  SOLICITACAO_FINALIZAR_CANCELAR,
  SOLICITACAO_FINALIZAR_ERRO,
  SOLICITACAO_FINALIZAR_SUCESSO,
} from '../dialogo-finalizar-retorno/anexos/dialogo-finalizar-retorno.model';
import { ErroApi, logErroApi, normalizarErro } from '../../util/error-api.util';
import { SolicitacaoService } from './anexos/solicitacoes.service';
import {
  ContadorSolicitacoes,
  EventoSolicitacao,
  SolicitacaoForm,
  SolicitacoesModel,
} from './anexos/solicitacoes.model';
import { DialogFinalizarRetornoService } from '../dialogo-finalizar-retorno/anexos/dialog-finalizar-retorno.service';

import { PIN_SOLICITAR_ENCARREGADO } from '../dialogo-pin/anexos/dialogo-pin.model';
import { DialogPinService } from '../dialogo-pin/anexos/dialog-pin.service';

/* =========================================================================
 * TIPOS
 * ========================================================================= */
export type EtapaSolicitacao = 'CONFIRMAR_ENVIO' | 'VALIDAR_PIN' | 'ENVIAR_SOLICITACAO';

type DesfechoTipo = 'OK' | 'CANCELOU' | 'NEUTRO' | 'ERRO';

interface Desfecho {
  resultado: DesfechoTipo;
  erro?: ErroApi;
}

interface Resultado {
  resultado: 'OK' | 'CANCELOU' | 'ERRO';
  dados?: string;
  erros?: string[];
  erro?: ErroApi;
}

/** Retorno da etapa de PIN: desfecho do diálogo + PIN quando capturado. */
interface DesfechoPin {
  desfecho: Desfecho;
  pin?: string;
}

interface ContextoSolicitacao {
  solicitanteId: string;
  solicitadoId: string;
  solicitadoNome: string;
  operadorNome: string;
  tagAtivoId: string | null;
  mensagem: string;
  resumo: string;
}

/* =========================================================================
 * CONSTANTES
 * ========================================================================= */
const FALLBACK_ERRO = 'Não foi possível enviar a solicitação.';
const TAG = '[SOLICITACAO]';

/* =========================================================================
 * COMPONENTE
 * ========================================================================= */
@Component({
  selector: 'app-fluxo-solicitacao',
  template: '',
  host: { style: 'display: none' },
})
export class FluxoSolicitacao {
  /* ---------------- Dependências ---------------- */
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmarService = inject(DialogConfirmarService);
  private readonly finalizarRetornoService = inject(DialogFinalizarRetornoService);
  private readonly pinService = inject(DialogPinService);
  private readonly solicitacaoService = inject(SolicitacaoService);
  private readonly alocacaoService = inject(AlocacaoOperacionalService);
  private readonly authService = inject(AuthService);

  /* ---------------- Entradas e fontes ---------------- */
  public estadoAtual = input<string>('');

  private readonly terminal = this.authService.usuario;
  private readonly autenticado = this.authService.autenticado;
  private readonly alocacao = this.alocacaoService.buscarAlocacaoOperacional;

  /* ---------------- Estado do fluxo ---------------- */
  readonly etapa = signal<EtapaSolicitacao | null>(null);
  private readonly ocupado = signal(false);

  readonly ultimoErro = signal<ErroApi | null>(null);
  readonly ultimaSolicitacao = signal<SolicitacoesModel | null>(null);

  readonly ultimoStatus = computed<number | null>(() => this.ultimoErro()?.status ?? null);
  readonly ultimoCorpo = computed<unknown>(() => this.ultimoErro()?.corpo ?? null);

  /* =======================================================================
   * ENTRADA
   * ===================================================================== */
  disparar(evento: EventoSolicitacao): void {
    console.log(`${TAG} disparar()`, {
      evento,
      etapa: this.etapa(),
      ocupado: this.ocupado(),
      estado: this.estadoAtual(),
    });

    if (this.ocupado() || this.etapa() !== null) {
      console.log(`${TAG} disparar() → bloqueado pela trava`, {
        ocupado: this.ocupado(),
        etapa: this.etapa(),
      });
      return;
    }

    this.avancar();
  }

  inspecionar(): void {
    const erro = this.ultimoErro();
    if (!erro) {
      console.warn(`${TAG} inspecionar() → nenhum erro registrado até agora`);
      return;
    }
    logErroApi('inspeção manual', erro);
  }

  /* =======================================================================
   * ORQUESTRAÇÃO
   * ===================================================================== */
  private avancar(): void {
    this.ocupado.set(true);

    this.carregarContexto()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ctx: ContextoSolicitacao) => {
          console.log(`${TAG} avancar() → contexto carregado`, ctx);
          this.executar(ctx);
        },
        error: (origem: unknown) => {
          console.log(`${TAG} avancar() → erro ao carregar contexto`, origem);
          const erro = this.registrarErro(origem, 'avancar/carregar contexto');
          this.encerrar();
          this.exibirErro(
            SOLICITACAO_FINALIZAR_ERRO,
            { erros: [...erro], erro },
            undefined,
            'Solicitar encarregado',
          );
        },
      });
  }

  private executar(ctx: ContextoSolicitacao): void {
    console.log(`${TAG} executar() → iniciando cadeia`, { ctx });

    this.etapa.set('CONFIRMAR_ENVIO');

    this.cadeia(ctx)
      .pipe(
        defaultIfEmpty({ resultado: 'CANCELOU' } as Resultado),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r: Resultado) => {
          console.log(`${TAG} executar() → cadeia concluída`, { resultado: r });
          this.concluir(ctx, r);
        },
        error: (origem: unknown) => {
          console.log(`${TAG} executar() → cadeia falhou`, origem);
          const erro = this.registrarErro(origem, 'executar/cadeia');
          this.concluir(ctx, { resultado: 'ERRO', erros: [...erro], erro });
        },
      });
  }

  /**
   * CONFIRMAÇÃO → PIN → GRAVAÇÃO
   * Cada etapa pode interromper a cadeia via this.parada().
   */
  private cadeia(ctx: ContextoSolicitacao): Observable<Resultado> {
    return this.confirmarEnvio(ctx).pipe(
      switchMap((confirmacao: Desfecho): Observable<Resultado> => {
        const paradaConfirmacao = this.parada(confirmacao, ctx.resumo);
        if (paradaConfirmacao) {
          console.log(`${TAG} cadeia() → interrompido na confirmação`, paradaConfirmacao);
          return of<Resultado>(paradaConfirmacao);
        }

        this.etapa.set('VALIDAR_PIN');

        return this.solicitarPin(ctx).pipe(
          switchMap(({ desfecho, pin }: DesfechoPin): Observable<Resultado> => {
            const paradaPin = this.parada(desfecho, ctx.resumo);
            if (paradaPin) {
              console.log(`${TAG} cadeia() → interrompido no PIN`, paradaPin);
              return of<Resultado>(paradaPin);
            }

            this.etapa.set('ENVIAR_SOLICITACAO');

            return this.gravar(ctx, pin).pipe(
              map<SolicitacoesModel, Resultado>((solicitacao) => {
                this.ultimaSolicitacao.set(solicitacao);
                console.log(`${TAG} cadeia() → solicitação criada`, {
                  id: solicitacao?.id ?? null,
                });
                return { resultado: 'OK' };
              }),
            );
          }),
        );
      }),
    );
  }

  /* =======================================================================
   * ETAPA 1 · CONFIRMAÇÃO
   * Sem o "detalhe": o modal recebe só o resumo curto do atendimento.
   * ===================================================================== */
  private confirmarEnvio(ctx: ContextoSolicitacao): Observable<Desfecho> {
    console.log(`${TAG} confirmarEnvio() → abrindo confirmação`, {
      solicitanteId: ctx.solicitanteId,
      solicitadoId: ctx.solicitadoId,
      mensagem: ctx.mensagem,
      resumo: ctx.resumo,
    });

    return this.confirmar({
      ...SOLICITACAO_CONFIRMAR_ENVIO,
      mensagem: ctx.mensagem,
      dados: ctx.resumo,
    });
  }

  /* =======================================================================
   * ETAPA 2 · PIN
   * O PIN só é solicitado depois que o operador confirma o envio.
   * ===================================================================== */
  private solicitarPin(ctx: ContextoSolicitacao): Observable<DesfechoPin> {
    console.log(`${TAG} solicitarPin() → abrindo diálogo de PIN`);

    return this.pinService
      .abrir({
        ...PIN_SOLICITAR_ENCARREGADO,
        usuario: ctx.solicitadoNome,
        // Se a validação do PIN é feita no backend, preencha `acao`:
        // acao: (pin) => this.solicitacaoService.validarPin(pin),
      })
      .pipe(
        map((resposta: string | undefined): DesfechoPin => {
          // dialogRef.closed emite undefined quando o CDK fecha sem resultado
          if (!resposta || resposta === 'cancelado') {
            return { desfecho: { resultado: 'CANCELOU' } };
          }
          if (resposta === 'erro') {
            return { desfecho: { resultado: 'ERRO' } };
          }
          // 'finalizado' veio do `acao`; qualquer outro valor é o próprio PIN
          return {
            desfecho: { resultado: 'OK' },
            pin: resposta === 'finalizado' ? undefined : resposta,
          };
        }),
        catchError((origem: unknown) =>
          of<DesfechoPin>({
            desfecho: {
              resultado: 'ERRO',
              erro: this.registrarErro(origem, 'solicitarPin'),
            },
          }),
        ),
      );
  }

  /* =======================================================================
   * ETAPA 3 · GRAVAÇÃO
   * ===================================================================== */
  private gravar(ctx: ContextoSolicitacao, pin?: string): Observable<SolicitacoesModel> {
    const form: SolicitacaoForm = {
      solicitanteId: ctx.solicitanteId,
      solicitadoId: ctx.solicitadoId,
      tagAtivoId: ctx.tagAtivoId ?? undefined,
      observacao: ctx.mensagem,
    };

    console.log(`${TAG} gravar() → emitindo createSolicitacao`, {
      form,
      possuiPin: !!pin,
    });

    return this.solicitacaoService.criar(form);
  }

  /* =======================================================================
   * DESFECHO
   * ===================================================================== */
  private concluir(ctx: ContextoSolicitacao, r: Resultado): void {
    console.log(`${TAG} concluir() → avaliando desfecho`, { ctx, resultado: r });

    const dados = r.dados ?? ctx.resumo;

    if (r.resultado === 'OK') {
      this.recarregarContador(ctx.tagAtivoId);
      this.encerrar();
      this.exibirAviso(SOLICITACAO_FINALIZAR_SUCESSO, dados);
      return;
    }

    if (r.resultado === 'ERRO') {
      this.encerrar();
      this.exibirErro(SOLICITACAO_FINALIZAR_ERRO, r, undefined, 'Solicitar encarregado');
      return;
    }

    this.encerrar();
    this.exibirAviso(SOLICITACAO_FINALIZAR_CANCELAR, dados);
  }


  private recarregarContador(tagAtivoId: string | null): void {
    const escopo = tagAtivoId
      ? { tagAtivoId }
      : { solicitadoId: this.alocacao()?.operadorId ?? undefined };

    this.solicitacaoService
      .contar(escopo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c: ContadorSolicitacoes) => console.log(`${TAG} contador atualizado`, c),
        error: () => {
          /* silencioso de propósito */
        },
      });
  }

  /* =======================================================================
   * CONTEXTO
   * defer transforma o throw do montador em notificação de erro.
   * ===================================================================== */
  private carregarContexto(): Observable<ContextoSolicitacao> {
    return defer(() => of(this.montarContexto()));
  }

  private montarContexto(): ContextoSolicitacao {
    const alocacao = this.alocacao();

    const solicitanteId = alocacao?.operadorId ?? null;
    const solicitadoId = alocacao?.gestorId ?? null;
    const tagAtivoId = alocacao?.tagAtivoId ?? this.terminal()?.tagAtivoId ?? null;

    if (!solicitanteId) {
      throw new Error('Usuário não autenticado: não é possível solicitar o encarregado.');
    }
    if (!solicitadoId) {
      throw new Error(
        'Encarregado não identificado para este ativo. Verifique a alocação do turno.',
      );
    }
    if (!tagAtivoId) {
      throw new Error('Terminal sem ativo vinculado: não é possível solicitar o encarregado.');
    }

    const operador = alocacao?.operador?.nome?.toUpperCase() ?? 'OPERADOR';
    const encarregado = alocacao?.gestor?.nome?.toUpperCase() ?? 'ENCARREGADO';
    const tag = alocacao?.tagAtivo?.descricao ?? tagAtivoId;
    const equipamento = this.nomeEquipamento(alocacao);
    const estado = this.estadoAtual();

    const mensagem = `${operador} está solicitando o supervisor no ativo ${tag}. Estado do ativo: ${estado}.`;
    const resumo = [tag, equipamento, encarregado].filter(Boolean).join(' · ');

    return {
      solicitanteId,
      solicitadoId,
      solicitadoNome: encarregado,
      operadorNome: operador,
      tagAtivoId,
      mensagem,
      resumo,
    };
  }

  private nomeEquipamento(
    alocacao: ReturnType<AlocacaoOperacionalService['buscarAlocacaoOperacional']>,
  ): string {
    const ativo = alocacao?.tagAtivo?.ativo?.descricao ?? '';
    const modelo = alocacao?.tagAtivo?.ativo?.modelo ?? '';
    return [ativo, modelo].filter(Boolean).join(' - ');
  }

  /* =======================================================================
   * WRAPPERS DOS MODAIS
   * ===================================================================== */
  private confirmar(config: PresetConfirmar): Observable<Desfecho> {
    return this.confirmarService.confirmar({ ...config, acao: () => of(true) }).pipe(
      defaultIfEmpty('cancelado'),
      map((r: string) => this.desfecho(r, this.confirmarService, 'confirmar')),
    );
  }

  private exibir(config: PresetFinalizar): Observable<unknown> {
    return this.finalizarRetornoService.finalizar({ ...config, acao: () => of(true) }).pipe(
      defaultIfEmpty(null),
      catchError((origem: unknown) => {
        console.log(`${TAG} exibir() → modal falhou, seguindo fluxo`, origem);
        return of(null);
      }),
    );
  }

  /* =======================================================================
   * MODAIS DE AVISO
   * ===================================================================== */
  private exibirAviso(preset: PresetFinalizar, dados?: string, depois?: () => void): void {
    this.exibir({
      ...preset,
      operacao: preset.operacao ?? 'Ok',
      dados,
      erros: [],
    }).subscribe(() => depois?.());
  }

  private exibirErro(
    preset: PresetFinalizar,
    falha: { erros?: string[]; erro?: ErroApi },
    depois?: () => void,
    operacao?: string,
  ): void {
    const erros =
      falha.erros?.length && falha.erros.length > 0
        ? falha.erros
        : falha.erro?.length
          ? [...falha.erro]
          : [FALLBACK_ERRO];

    this.exibir({
      ...preset,
      operacao: operacao ?? preset.operacao ?? 'Ok',
      erros,
    }).subscribe(() => depois?.());
  }

  /* =======================================================================
   * FUNIL DE ERRO
   * ===================================================================== */
  private registrarErro(origem: unknown, contexto: string): ErroApi {
    const erro = normalizarErro(origem, FALLBACK_ERRO);
    this.ultimoErro.set(erro);

    console.log(`${TAG} registrarErro() → normalizado`, {
      contexto,
      status: erro.status,
      mensagens: [...erro],
      corpo: erro.corpo,
    });

    logErroApi(`${contexto} · etapa ${this.etapa() ?? 'nenhuma'}`, erro);
    return erro;
  }

  private desfecho(r: unknown, servico?: object, contexto = 'diálogo'): Desfecho {
    if (r === 'finalizado') return { resultado: 'OK' };
    if (r === 'neutro') return { resultado: 'NEUTRO' };
    if (r === 'erro') {
      return {
        resultado: 'ERRO',
        erro: servico ? this.erroDoDialogo(servico, contexto) : undefined,
      };
    }
    return { resultado: 'CANCELOU' };
  }

  private parada(d: Desfecho, dados?: string): Resultado | null {
    if (d.resultado === 'OK') return null;

    if (d.resultado === 'ERRO') {
      return {
        resultado: 'ERRO',
        erros: d.erro ? [...d.erro] : [FALLBACK_ERRO],
        erro: d.erro,
      };
    }

    return { resultado: 'CANCELOU', dados };
  }

  private erroDoDialogo(servico: object, contexto: string): ErroApi | undefined {
    const alvo = servico as Record<string, unknown>;

    for (const nome of ['ultimosErros', 'ultimoErro', 'erro', 'erros']) {
      const acessor = alvo[nome];
      if (typeof acessor !== 'function') continue;

      let valor: unknown;
      try {
        valor = (acessor as () => unknown).call(servico);
      } catch {
        continue;
      }

      if (valor === null || valor === undefined) continue;
      if (Array.isArray(valor) && valor.length === 0) continue;

      return this.registrarErro(valor, contexto);
    }

    console.warn(
      `${TAG} erroDoDialogo() → ${contexto}: devolveu "erro" sem expor o payload. ` +
        'Exponha ultimoErro() ou ultimosErros() no serviço do diálogo.',
    );
    return undefined;
  }

  /* =======================================================================
   * ESTADO
   * ===================================================================== */
  private encerrar(): void {
    console.log(`${TAG} encerrar() → limpando estado`, {
      etapaAnterior: this.etapa(),
      ocupadoAnterior: this.ocupado(),
    });
    this.etapa.set(null);
    this.ocupado.set(false);
  }
}
