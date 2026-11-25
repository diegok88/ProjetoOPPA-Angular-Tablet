import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  concatMap,
  defaultIfEmpty,
  EMPTY,
  expand,
  filter,
  map,
  Observable,
  of,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AlocacaoOperacionalService } from '../../services/alocacao-operacional.service';
import { EstadoAtivoService } from '../../services/estado-ativo.service';
import { DialogConfirmarService } from '../dialogo-confimar/anexos/dialog-confirmar.service';
import { DialogSolucaoService } from '../dialogo-solucao/anexos/dialogo-solucao.service';
import { DialogFinalizarRetornoService } from '../dialogo-finalizar-retorno/anexos/dialog-finalizar-retorno.service';
import { DialogPinService } from '../dialogo-pin/anexos/dialog-pin.service';
import {
  CondicaoOcorrencia,
  OcorrenciaForm,
  OcorrenciaQuery,
  TipoOcorrenciaType,
} from './anexos/ocorrencia.model';
import { FalhasModel, FalhasQuery } from './anexos/falhas.model';
import {
  CondicaoFluxo,
  FluxoOcorrenciaForm,
  FluxoOcorrenciaModel,
  FluxoOcorrenciaQuery,
} from './anexos/fluxo-ocorrencia.model';
import { SolucoesModel, SolucoesQuery } from './anexos/solucoes.model';
import {
  FLUXO_CONFIRMAR_BLOQUEIO_OCORRENCIA,
  FLUXO_CONFIRMAR_FALHA_TRANSFERIDA,
  FLUXO_CONFIRMAR_INICIO_OCORRENCIA,
  FLUXO_CONFIRMAR_REGISTRAR_FALHA,
  FLUXO_CONFIRMAR_SOLUCAO,
} from '../dialogo-confimar/anexos/dialogo-confirmar.model';
import { INPUT_CODIGO_FALHA } from '../dialogo-input/anexos/dialogo-input.model';
import {
  DialogoSolucaoData,
  SOLUCAO_FINALIZAR_OCORRENCIA,
  SOLUCAO_FINALIZAR_OCORRENCIA_MANUTENCAO,
  SolucaoOpcao,
} from '../dialogo-solucao/anexos/dialogo-solucao.model';
import {
  FINALIZAR_CANCELADO_INICIAR,
  FINALIZAR_CANCELADO_REGISTRAR_FALHA,
  FINALIZAR_ERRO_INICIAR,
  FINALIZAR_ERRO_REGISTRAR_FALHA,
  FINALIZAR_NAO_AUTORIZADO_INICIAR,
  FINALIZAR_SUCESSO_FINALIZAR,
  FINALIZAR_SUCESSO_INICIAR,
  FINALIZAR_SUCESSO_REGISTRAR_FALHA,
  FINALIZAR_SUCESSO_TRANSFERIR,
  PresetFinalizar,
} from '../dialogo-finalizar-retorno/anexos/dialogo-finalizar-retorno.model';
import {
  PIN_CADASTRO_FALHA,
  PIN_CONFIRMAR_SOLUCAO,
  PIN_INICIAR_FLUXO,
} from '../dialogo-pin/anexos/dialogo-pin.model';
import { formataDataLocal } from '../../util/formatar-data.util';
import { ErroApi, logErroApi, normalizarErro, semRegistro } from '../../util/error-api.util';
import { DialogoListarService } from '../dialogo-listar/anexos/dialogo-listar.service';
import { LISTAGEM_DICA_SOLUCAO } from '../dialogo-listar/anexos/dialogo-listar.model';
import { DialogoPinCompService } from '../dialogo-pin-comp/anexos/dialogo-pin-comp.service';
import {
  CREDENCIAL_CONFIRMAR_SOLUCAO,
  CREDENCIAL_INICIAR_FLUXO,
  DialogoCredencialData,
} from '../dialogo-pin-comp/anexos/dialogo-pin-comp.model';
import { DialogInputService } from '../dialogo-input/anexos/dialog-input.service';
import { FalhasService } from './anexos/falhas.service';
import { FluxoOcorrenciaService } from './anexos/fluxo-ocorrencia.service';
import { OcorrenciaService } from './anexos/ocorrencia.service';
import { SolucoesService } from './anexos/solucao.service';

/* =========================================================================
 * TIPOS
 * ========================================================================= */

export type Etapa = 'CADASTRAR_FALHA' | 'VERIFICACAO_INICIAR' | 'VERIFICACAO_ANDAMENTO';
export type ResultadoEtapa = 'OK' | 'CANCELOU' | 'ERRO';
export type EventoFluxo = { tipo: 'ABRIR' } | { tipo: 'ESTADO_FALHA' };

type DesfechoResultado = ResultadoEtapa | 'NEUTRO';

type ConfirmarConfig = Omit<Parameters<DialogConfirmarService['confirmar']>[0], 'acao'>;
type AvisoConfig = Omit<Parameters<DialogFinalizarRetornoService['finalizar']>[0], 'acao'>;
type PinConfig = Omit<Parameters<DialogPinService['abrir']>[0], 'acao' | 'usuario'>;
type CredencialConfig = Omit<DialogoCredencialData, 'acao'>;
type ListagemConfig = Parameters<DialogoListarService['listar']>[0];
type ServicoDialogo = object;

interface Resultado {
  resultado: ResultadoEtapa;
  dados?: string;
  erros?: string[];
  erro?: ErroApi;
  desfecho?: 'SOLUCIONADO' | 'TRANSFERIR';
  solucaoId?: string;
  tipoOcorrencia?: TipoOcorrenciaType;
  sair?: boolean;
  voltarPara?: Etapa;
}

interface Desfecho {
  resultado: DesfechoResultado;
  valor?: string;
  erro?: ErroApi;
}

interface BuscaFalha {
  falha?: FalhasModel;
  erro?: ErroApi;
}

/* =========================================================================
 * CONSTANTES
 * ========================================================================= */

const FALLBACK_ERRO = 'Não foi possível confirmar a operação.';
const TAG = '[FLUXO]';
const LIMITE_DICAS = 5;

/** Único perfil que usa o DialogPin simples (senha do operador alocado). */
const PERFIL_PIN_SIMPLES = 'OPERADOR';

const QUERY = {
  CARREGAR_OCORRENCIA: (estado: string): OcorrenciaQuery => ({
    consulta: 'ocorrencia_falhas',
    estadoAtivoId: estado,
    condicaoOcorrencia: CondicaoOcorrencia.EXECUCAO.valor,
    status: true,
  }),
  CARREGAR_FALHA: (codigo: string): FalhasQuery => ({
    codigo,
    status: true,
    consulta: 'falhas_padrao',
  }),
  CARREGAR_FLUXO: (ocorrenciaId: string, dataInicial: string): FluxoOcorrenciaQuery => ({
    ocorrenciaId,
    dataInicial,
    consulta: 'fluxo_parcial',
  }),
  CARREGAR_SOLUCAO: (falhaId: string, desPerfil: string): SolucoesQuery => ({
    falhaId,
    desPerfil,
    status: true,
    consulta: 'solucoes_padrao',
  }),
};

/* =========================================================================
 * COMPONENTE
 * ========================================================================= */

@Component({
  selector: 'app-fluxo-ocorrencia',
  template: '',
  host: { style: 'display: none' },
})
export class FluxoOcorrencia {
  /* ---------------- Dependências ---------------- */

  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogPin = inject(DialogPinService);
  private readonly dialogPinComp = inject(DialogoPinCompService);
  private readonly confirmarService = inject(DialogConfirmarService);
  private readonly finalizarRetornoService = inject(DialogFinalizarRetornoService);
  private readonly listagemService = inject(DialogoListarService);
  private readonly inputService = inject(DialogInputService);
  private readonly dialogSolucao = inject(DialogSolucaoService);
  private readonly ocorrenciaService = inject(OcorrenciaService);
  private readonly falhaService = inject(FalhasService);
  private readonly solucoesService = inject(SolucoesService);
  private readonly fluxoOcorrenciaService = inject(FluxoOcorrenciaService);
  private readonly estadoAtivoService = inject(EstadoAtivoService);
  private readonly alocacaoService = inject(AlocacaoOperacionalService);
  private readonly authService = inject(AuthService);

  /* ---------------- Entrada e fontes de dados ---------------- */

  public estadoAtual = input<string>();

  private readonly identification = this.estadoAtivoService.identificationState;
  private readonly terminal = this.authService.usuario;
  private readonly autenticado = this.authService.autenticado;
  private readonly ocorrencia = this.ocorrenciaService.buscarOcorrencia;
  private readonly fluxoOcorrencia = this.fluxoOcorrenciaService.buscarFluxoOcorrencia;
  private readonly alocacao = this.alocacaoService.buscarAlocacaoOperacional;

  public readonly sair = output<void>();

  /* ---------------- Estado do fluxo ---------------- */

  readonly etapa = signal<Etapa | null>(null);
  private readonly ocupado = signal(false);

  readonly perfilAtual = signal<string | null>(null);

  private readonly resumoFalhaRegistrada = signal<string | null>(null);

  readonly ultimoErro = signal<ErroApi | null>(null);
  readonly ultimoStatus = computed<number | null>(() => this.ultimoErro()?.status ?? null);
  readonly ultimoCorpo = computed<unknown>(() => this.ultimoErro()?.corpo ?? null);

  private readonly perfilOperador = computed<string | null>(() => {
    const normalizado = this.normalizarPerfil(this.autenticado()?.perfil);
    return normalizado || null;
  });

  readonly podeAtuar = computed<boolean>(() => {
    const atribuido = this.normalizarPerfil(this.perfilAtual());
    const operador = this.perfilOperador();

    if (!atribuido) return true;
    if (!operador) return true;

    const igual = atribuido === operador;
    console.log(`${TAG} podeAtuar()`, { atribuido, operador, igual });
    return igual;
  });

  readonly perfilDivergente = computed<boolean>(() => {
    const atribuido = this.normalizarPerfil(this.perfilAtual());
    const operador = this.perfilOperador();
    return !!atribuido && !!operador && atribuido !== operador;
  });

  /* ---------------- Ciclo de vida ---------------- */

  constructor() {
    console.log(`${TAG} constructor()`, {
      estadoInicial: this.estadoAtual(),
      identificacao: this.identification(),
    });

    effect(() => {
      const estado = this.estadoAtual();
      const identificacao = this.identification();

      untracked(() => {
        console.log(`${TAG} effect(estadoAtual)`, {
          estado,
          identificacao,
          etapa: this.etapa(),
          ocupado: this.ocupado(),
        });

        if (estado !== 'FALHA') {
          this.encerrar();
          return;
        }

        if (identificacao) {
          this.disparar({ tipo: 'ESTADO_FALHA' });
          return;
        }

        console.log(`${TAG} effect(estadoAtual) → FALHA sem identificação, aguardando`);
      });
    });
  }

  disparar(_evento: EventoFluxo): void {
    console.log(`${TAG} disparar()`, {
      evento: _evento,
      estado: this.estadoAtual(),
      etapa: this.etapa(),
      ocupado: this.ocupado(),
    });

    if (this.estadoAtual() !== 'FALHA') {
      this.encerrar();
      return;
    }

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

  finalizar(
    solucaoId: string | null = null,
    tipoOcorrencia: TipoOcorrenciaType | null = null,
  ): void {
    console.log(`${TAG} finalizar() → chamada explícita`, { solucaoId });
    this.finalizarOcorrencia(this.perfilAtual() ?? '', solucaoId, tipoOcorrencia);
  }

  /* =======================================================================
   * ORQUESTRAÇÃO
   * ===================================================================== */

  private avancar(): void {
    console.log(`${TAG} avancar()`, {
      ocupado: this.ocupado(),
      etapa: this.etapa(),
      identificacao: this.identification(),
    });

    if (this.ocupado()) {
      console.log(`${TAG} avancar() → já ocupado, abortando`);
      return;
    }

    this.ocupado.set(true);

    this.buscarOcorrencia()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          console.log(`${TAG} avancar() → contexto carregado`);
          this.executar(this.decidirEtapa());
        },
        error: (origem) => {
          console.log(`${TAG} avancar() → erro ao carregar contexto`, origem);
          this.encerrar();
          const erro = this.registrarErro(origem, 'avancar/carregar contexto');
          this.exibirErro(
            FINALIZAR_ERRO_INICIAR,
            { erros: [...erro], erro },
            undefined,
            'Carregar ocorrência',
          );
        },
      });
  }

  private decidirEtapa(): Etapa | null {
    const ocorrencia = this.ocorrencia();
    const fluxo = this.fluxoOcorrencia();
    const perfilFluxo = this.perfilDoFluxo(fluxo);

    if (perfilFluxo) {
      this.perfilAtual.set(perfilFluxo);
    } else {
      this.perfilAtual.set('OPERADOR');
    }

    console.log(`${TAG} decidirEtapa()`, {
      ocorrencia: ocorrencia ? { id: ocorrencia.id, falhaId: ocorrencia.falhaId } : null,
      fluxo: fluxo ? { id: fluxo.id, perfil: perfilFluxo } : null,
      perfilAtual: this.perfilAtual(),
      perfilOperador: this.perfilOperador(),
    });

    if (!ocorrencia) {
      console.log(`${TAG} decidirEtapa() → sem ocorrência, etapa=null`);
      return null;
    }

    if (!ocorrencia.falhaId) {
      console.log(`${TAG} decidirEtapa() → sem falhaId, etapa=CADASTRAR_FALHA`);
      return 'CADASTRAR_FALHA';
    }

    if (!fluxo) {
      console.log(`${TAG} decidirEtapa() → sem fluxo, etapa=null`);
      return null;
    }

    const etapa: Etapa = this.lerUsuarioDoFluxo(fluxo)
      ? 'VERIFICACAO_ANDAMENTO'
      : 'VERIFICACAO_INICIAR';

    console.log(`${TAG} decidirEtapa() → etapa decidida`, { etapa });
    return etapa;
  }

  private executar(etapa: Etapa | null): void {
    console.log(`${TAG} executar()`, {
      etapa,
      perfilAtual: this.perfilAtual(),
      perfilOperador: this.perfilOperador(),
      divergente: this.perfilDivergente(),
    });

    if (etapa === null) {
      console.log(`${TAG} executar() → nenhuma etapa, encerrando`);
      this.encerrar();
      return;
    }

    this.executarEtapa(etapa);
  }

  private executarEtapa(etapa: Etapa): void {
    console.log(`${TAG} executarEtapa() → início`, { etapa });
    this.etapa.set(etapa);
    this.ocupado.set(true);

    const padrao: Resultado = { resultado: 'CANCELOU' };

    this.cadeia(etapa)
      .pipe(defaultIfEmpty(padrao), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          console.log(`${TAG} executarEtapa() → cadeia concluída`, { etapa, resultado: r });
          this.concluir(etapa, r);
        },
        error: (origem) => {
          console.log(`${TAG} executarEtapa() → cadeia falhou`, { etapa, origem });
          const erro = this.registrarErro(origem, `executarEtapa/${etapa}`);
          this.concluir(etapa, { resultado: 'ERRO', erros: [...erro], erro });
        },
      });
  }

  private cadeia(etapa: Etapa): Observable<Resultado> {
    console.log(`${TAG} cadeia() → escolhendo cadeia`, etapa);
    switch (etapa) {
      case 'CADASTRAR_FALHA':
        return this.cadeiaCadastrarFalha();
      case 'VERIFICACAO_INICIAR':
        return this.cadeiaVerificacaoIniciar();
      case 'VERIFICACAO_ANDAMENTO':
        return this.cadeiaVerificacaoAndamento();
    }
  }

  /* =======================================================================
   * ETAPA 1 · CADASTRAR_FALHA — sempre do operador
   * codigo → confirmação → DialogPin → aviso de ocorrência atualizada
   * ===================================================================== */

  private cadeiaCadastrarFalha(): Observable<Resultado> {
    console.log(`${TAG} cadeiaCadastrarFalha() → abrindo input de código`);
    return this.pedirCodigo().pipe(
      switchMap((d) => {
        console.log(`${TAG} cadeiaCadastrarFalha() → input retornou`, d);
        const parada = this.parada(d);
        if (parada) {
          console.log(`${TAG} cadeiaCadastrarFalha() → interrompido no input`, parada);
          return of<Resultado>(parada);
        }

        const codigo = d.valor ?? '';

        return this.buscarFalha(codigo).pipe(
          switchMap((busca) => {
            console.log(`${TAG} cadeiaCadastrarFalha() → busca concluída`, {
              achou: !!busca.falha,
              erro: busca.erro ? { status: busca.erro.status, mensagens: [...busca.erro] } : null,
            });

            if (!busca.falha) {
              return of<Resultado>({
                resultado: 'ERRO',
                erros: busca.erro ? [...busca.erro] : [FALLBACK_ERRO],
                erro: busca.erro,
              });
            }

            const descricao = this.descreverFalha(codigo, busca.falha);
            this.resumoFalhaRegistrada.set(descricao);

            return this.confirmarCadastroFalha(busca.falha, descricao);
          }),
        );
      }),
    );
  }

  private confirmarCadastroFalha(falha: FalhasModel, dados: string): Observable<Resultado> {
    console.log(`${TAG} confirmarCadastroFalha() → abrindo confirmação`, {
      falhaId: falha.id,
      dados,
    });
    console.log(`${TAG} confirmarCadastroFalha() → abrindo confirmação`, {
      falhaId: falha.id,
      dados,
    });

    return this.confirmar({ ...FLUXO_CONFIRMAR_REGISTRAR_FALHA, dados }).pipe(
      switchMap((d) => {
        console.log(`${TAG} confirmarCadastroFalha() → confirmação retornou`, d);
        const parada = this.parada(d, dados);
        if (parada) {
          console.log(`${TAG} confirmarCadastroFalha() → interrompido`, parada);
          return of<Resultado>(parada);
        }

        return this.pinCadastroFalha(falha, dados);
      }),
    );
  }

  private pinCadastroFalha(falha: FalhasModel, dados: string): Observable<Resultado> {
    const perfilAtual = this.perfilAtual();
    console.log(`${TAG} pinCadastroFalha() → abrindo DialogPin (cadastro do operador)`, {
      falhaId: falha.id,
      perfil: perfilAtual,
    });

    if (perfilAtual !== 'OPERADOR') {
      return this.pedirPinComp(CREDENCIAL_CONFIRMAR_SOLUCAO).pipe(
        switchMap((d) => {
          console.log(`${TAG} pinCadastroFalha() → PIN retornou`, d);
          const parada = this.parada(d, dados);
          if (parada) {
            console.log(`${TAG} pinCadastroFalha() → interrompido`, parada);
            return of<Resultado>(parada);
          }
          return this.gravarFalha(falha);
        }),
      );
    } else {
      return this.pedirPin(PIN_CADASTRO_FALHA).pipe(
        switchMap((d) => {
          console.log(`${TAG} pinCadastroFalha() → PIN retornou`, d);
          const parada = this.parada(d, dados);
          if (parada) {
            console.log(`${TAG} pinCadastroFalha() → interrompido`, parada);
            return of<Resultado>(parada);
          }
          return this.gravarFalha(falha);
        }),
      );
    }
  }

  private gravarFalha(falha: FalhasModel): Observable<Resultado> {
    const ocorrencia = this.ocorrencia();

    console.log(`${TAG} gravarFalha() → gravando`, {
      falhaId: falha.id,
      ocorrenciaId: ocorrencia?.id ?? null,
    });

    if (!ocorrencia) {
      const erro = this.registrarErro(
        { message: 'Ocorrência não localizada para gravar a falha.' },
        'gravarFalha',
      );
      return of<Resultado>({ resultado: 'ERRO', erros: [...erro], erro });
    }

    const atualizar: OcorrenciaForm = { falhaId: falha.id };

    return this.ocorrenciaService.atualizar(ocorrencia.id, atualizar).pipe(
      map<unknown, Resultado>(() => {
        console.log(`${TAG} gravarFalha() → PUT concluído com sucesso`);
        return { resultado: 'OK' };
      }),
    );
  }

  /* =======================================================================
   * ETAPA 2 · VERIFICACAO_INICIAR — o perfil de destino VAI iniciar
   * ===================================================================== */

  private cadeiaVerificacaoIniciar(): Observable<Resultado> {
    const perfil = this.perfilAtual() ?? '';

    console.log(`${TAG} cadeiaVerificacaoIniciar() → início (sem conferência de falha)`, {
      perfil,
      perfilOperador: this.perfilOperador(),
    });

    return this.confirmarInicioOcorrencia(perfil);
  }

  private confirmarInicioOcorrencia(perfil: string): Observable<Resultado> {
    console.log(`${TAG} confirmarInicioOcorrencia() → abrindo confirmação`, { perfil });

    return this.confirmar({ ...FLUXO_CONFIRMAR_INICIO_OCORRENCIA, dados: perfil }).pipe(
      switchMap((d) => {
        console.log(`${TAG} confirmarInicioOcorrencia() → confirmação retornou`, d);
        const parada = this.parada(d, perfil);
        if (parada) {
          console.log(`${TAG} confirmarInicioOcorrencia() → interrompido`, parada);
          return of<Resultado>(parada);
        }

        return this.pinVerificacaoIniciar(perfil);
      }),
    );
  }

  private pinVerificacaoIniciar(perfil: string): Observable<Resultado> {
    const simples = this.usaPinSimples(perfil);

    console.log(`${TAG} pinVerificacaoIniciar() → abrindo PIN`, {
      perfil,
      perfilAtuante: this.perfilAtuante(perfil),
      dialogo: simples ? 'DialogPin' : 'DialogoPinComp',
    });

    const pin$ = simples
      ? this.pedirPin(PIN_INICIAR_FLUXO)
      : this.pedirPinComp(CREDENCIAL_INICIAR_FLUXO);

    return pin$.pipe(
      switchMap((d) => {
        console.log(`${TAG} pinVerificacaoIniciar() → PIN retornou`, d);
        const parada = this.parada(d, perfil);
        if (parada) {
          console.log(`${TAG} pinVerificacaoIniciar() → interrompido`, parada);
          return of<Resultado>(parada);
        }

        return this.gravarInicioVerificacao();
      }),
    );
  }

  private gravarInicioVerificacao(): Observable<Resultado> {
    const fluxo = this.fluxoOcorrencia();
    const usuarioId = this.autenticado()?.id;

    console.log(`${TAG} gravarInicioVerificacao() → dados`, {
      fluxoId: fluxo?.id ?? null,
      usuarioId: usuarioId ?? null,
      perfilAtuante: this.perfilAtuante(),
    });

    if (!fluxo || !usuarioId) {
      const erro = this.registrarErro(
        {
          message: !fluxo
            ? 'Fluxo da ocorrência não localizado para iniciar a verificação.'
            : 'Usuário não identificado: não é possível iniciar a verificação.',
        },
        'gravarInicioVerificacao',
      );
      return of<Resultado>({ resultado: 'ERRO', erros: [...erro], erro });
    }

    const atualizar: FluxoOcorrenciaForm = { usuarioId };

    return this.fluxoOcorrenciaService.atualizar(fluxo.id, atualizar).pipe(
      map<unknown, Resultado>(() => {
        console.log(`${TAG} gravarInicioVerificacao() → PUT concluído com sucesso`);
        return { resultado: 'OK' };
      }),
    );
  }

  /* =======================================================================
   * ETAPA 3 · VERIFICACAO_ANDAMENTO — a verificação JÁ foi iniciada
   * ===================================================================== */

  private cadeiaVerificacaoAndamento(): Observable<Resultado> {
    const perfil = this.perfilAtual() ?? '';
    const perfilOperador = this.perfilOperador();
    const divergente = this.perfilDivergente();

    console.log(`${TAG} cadeiaVerificacaoAndamento() → início`, {
      perfil,
      perfilOperador: perfilOperador,
      divergente: divergente,
    });

    if (perfil === 'OPERADOR') {
      return this.confirmarBloqueio(perfil).pipe(switchMap((b) => this.tratarBloqueio(b, perfil)));
    }

    return this.confirmarFalhaCorreta().pipe(
      switchMap((f): Observable<Resultado> => {
        const bloqueio = this.tratarConfirmacaoFalha(f, perfil);
        if (bloqueio) {
          console.log(
            `${TAG} cadeiaVerificacaoAndamento() → interrompido na conferência`,
            bloqueio,
          );
          return of<Resultado>(bloqueio);
        }

        return this.confirmarBloqueio(perfil).pipe(
          switchMap((b) => this.tratarBloqueio(b, perfil)),
        );
      }),
    );
  }

  private confirmarFalhaCorreta(): Observable<Desfecho> {
    const resumo = this.resumoFalha();

    console.log(`${TAG} confirmarFalhaCorreta() → abrindo conferência`, {
      perfilAtual: this.perfilAtual(),
      perfilOperador: this.perfilOperador(),
      resumo,
    });

    return this.confirmar({
      ...FLUXO_CONFIRMAR_FALHA_TRANSFERIDA,
      dados: resumo,
    });
  }

  private tratarConfirmacaoFalha(d: Desfecho, perfil: string): Resultado | null {
    console.log(`${TAG} tratarConfirmacaoFalha() → desfecho`, d);

    if (d.resultado === 'OK') return null;

    if (d.resultado === 'ERRO') {
      return {
        resultado: 'ERRO',
        erros: d.erro ? [...d.erro] : [FALLBACK_ERRO],
        erro: d.erro,
      };
    }

    if (d.resultado === 'NEUTRO') {
      console.log(`${TAG} tratarConfirmacaoFalha() → falha incorreta, reiniciando cadastro`);
      return { resultado: 'OK', dados: perfil, voltarPara: 'CADASTRAR_FALHA' };
    }

    return { resultado: 'CANCELOU', dados: perfil };
  }

  private resumoFalha(): string {
    const guardado = this.resumoFalhaRegistrada();
    if (guardado) {
      console.log(`${TAG} resumoFalha() → resumo do cadastro`, guardado);
      return guardado;
    }

    console.log('Falha: ', this.ocorrencia());
    const ocorrencia = this.ocorrencia() as unknown as {
      falhas?: { codigo?: string; descricao?: string };
    } | null;

    const falha = ocorrencia?.falhas;
    const descricao = falha?.descricao;

    if (descricao) {
      const texto = falha?.codigo ? `Código ${falha.codigo}: ${descricao}` : descricao;
      console.log(`${TAG} resumoFalha() → relação da ocorrência`, texto);
      return texto;
    }

    console.warn(`${TAG} resumoFalha() → ocorrência sem descrição de falha carregada`);
    return 'Falha registrada nesta ocorrência.';
  }

  private confirmarBloqueio(perfil: string): Observable<Desfecho> {
    let voltas = 0;

    const abrir = (): Observable<Desfecho> =>
      this.confirmar({ ...FLUXO_CONFIRMAR_BLOQUEIO_OCORRENCIA, dados: perfil });

    return abrir().pipe(
      expand((d) => {
        if (d.resultado !== 'NEUTRO') return EMPTY;

        if (++voltas >= LIMITE_DICAS) {
          console.warn(`${TAG} confirmarBloqueio() → limite de dicas atingido`, { voltas });
          return EMPTY;
        }

        return this.abrirDica().pipe(switchMap(() => abrir()));
      }),
      filter((d) => d.resultado !== 'NEUTRO'),
      take(1),
    );
  }

  private abrirDica(): Observable<unknown> {
    const falhaId = this.ocorrencia()?.falhaId ?? null;
    console.log(`${TAG} abrirDica() → carregando soluções`, { falhaId });

    if (!falhaId) {
      return this.exibir({
        ...FINALIZAR_SUCESSO_INICIAR,
        icone: 'alerta',
        titulo: 'Sem dicas',
        mensagem: 'Não há falha vinculada a esta ocorrência, portanto não há dicas de solução.',
        operacao: 'Voltar',
      });
    }

    return this.listarSolucoes(falhaId).pipe(
      switchMap((solucoes) => {
        console.log(`${TAG} abrirDica() → soluções recebidas`, { total: solucoes.length });

        if (!solucoes.length) {
          return this.exibir({
            ...FINALIZAR_SUCESSO_INICIAR,
            icone: 'alerta',
            titulo: 'Sem dicas cadastradas',
            mensagem: 'Não há soluções cadastradas para esta falha e perfil.',
            operacao: 'Voltar',
          });
        }

        const config: ListagemConfig = {
          ...LISTAGEM_DICA_SOLUCAO,
          dados: solucoes,
          campoRotulo: 'descricao',
          campoDetalhe: 'codigo',
        };

        return this.listagemService.listar(config);
      }),
    );
  }

  private tratarBloqueio(d: Desfecho, perfil: string): Observable<Resultado> {
    console.log(`${TAG} tratarBloqueio() → desfecho`, d);

    if (d.resultado === 'ERRO') {
      return of<Resultado>({
        resultado: 'ERRO',
        erros: d.erro ? [...d.erro] : [FALLBACK_ERRO],
        erro: d.erro,
      });
    }

    if (d.resultado !== 'OK') {
      return of<Resultado>({ resultado: 'CANCELOU', dados: perfil });
    }

    return this.pinVerificacaoAndamento(perfil);
  }

  private pinVerificacaoAndamento(perfil: string): Observable<Resultado> {
    const simples = this.usaPinSimples(perfil);

    console.log(`${TAG} pinVerificacaoAndamento() → abrindo PIN`, {
      perfil,
      perfilAtuante: this.perfilAtuante(perfil),
      dialogo: simples ? 'DialogPin' : 'DialogoPinComp',
    });

    const pin$ = simples
      ? this.pedirPin(PIN_CONFIRMAR_SOLUCAO)
      : this.pedirPinComp(CREDENCIAL_CONFIRMAR_SOLUCAO);

    return pin$.pipe(
      switchMap((d) => {
        console.log(`${TAG} pinVerificacaoAndamento() → PIN retornou`, d);
        const parada = this.parada(d, perfil);
        if (parada) {
          console.log(`${TAG} pinVerificacaoAndamento() → interrompido`, parada);
          return of<Resultado>(parada);
        }

        return this.perguntarSolucao(perfil);
      }),
    );
  }

  private perguntarSolucao(perfil: string): Observable<Resultado> {
    console.log(`${TAG} perguntarSolucao() → abrindo confirmação de solução`, { perfil });

    return this.confirmar({ ...FLUXO_CONFIRMAR_SOLUCAO, dados: perfil }).pipe(
      switchMap((d): Observable<Resultado> => {
        const decisao = this.decidirPerguntaSolucao(d);
        console.log(`${TAG} perguntarSolucao() → decisão`, {
          desfecho: d.resultado,
          decisao,
        });

        switch (decisao) {
          case 'ERRO':
            return of<Resultado>({
              resultado: 'ERRO',
              erros: d.erro?.length ? [...d.erro] : [FALLBACK_ERRO],
              erro: d.erro,
            });

          case 'CANCELOU':
            return of<Resultado>({ resultado: 'CANCELOU', dados: perfil });

          case 'TRANSFERIR':
            return of<Resultado>({ resultado: 'OK', dados: perfil, desfecho: 'TRANSFERIR' });

          case 'SOLUCIONADO':
          default:
            return this.escolherSolucao(perfil);
        }
      }),
    );
  }

  private escolherSolucao(perfil: string): Observable<Resultado> {
    const falhaId = this.ocorrencia()?.falhaId ?? null;

    if (!falhaId) {
      const erro = this.registrarErro(
        { message: 'Ocorrência sem falha vinculada: não há solução para escolher.' },
        'escolherSolucao',
      );
      return of<Resultado>({ resultado: 'ERRO', erros: [...erro], erro });
    }

    return this.buscarSolucoesParaFinalizar(falhaId).pipe(
      switchMap((solucoes) => {
        const opcoes = this.paraOpcoes(solucoes);

        if (!opcoes.length) {
          const erro = this.registrarErro(
            { message: 'Nenhuma solução válida cadastrada para esta falha e perfil.' },
            'escolherSolucao',
          );
          return of<Resultado>({ resultado: 'ERRO', erros: [...erro], erro });
        }

        const configPadrao: DialogoSolucaoData = {
          ...SOLUCAO_FINALIZAR_OCORRENCIA,
          usuario: perfil,
          opcoes,
        };

        const configManutencao: DialogoSolucaoData = {
          ...SOLUCAO_FINALIZAR_OCORRENCIA_MANUTENCAO,
          usuario: perfil,
          opcoes,
        };

        const config = perfil !== 'MANUTENÇÃO' ? configPadrao : configManutencao;

        return this.dialogSolucao.abrir(config).pipe(
          map((r): Resultado => {
            console.log(`${TAG} escolherSolucao() → modal retornou`, r);
            const d = this.desfecho(r, this.dialogSolucao, 'escolherSolucao');

            if (d.resultado === 'ERRO') {
              return {
                resultado: 'ERRO',
                erros: d.erro ? [...d.erro] : [FALLBACK_ERRO],
                erro: d.erro,
              };
            }

            if (d.resultado === 'CANCELOU') {
              return { resultado: 'CANCELOU', dados: perfil, sair: true };
            }

            if (d.resultado === 'NEUTRO') {
              return { resultado: 'CANCELOU', dados: perfil };
            }

            // ← aqui estava o furo: o signal agora devolve o objeto completo
            const selecao = this.dialogSolucao.solucaoSelecionada();

            if (!selecao?.solucaoId) {
              return {
                resultado: 'ERRO',
                erros: d.erro ? [...d.erro] : [FALLBACK_ERRO],
                erro: d.erro,
              };
            }

            return {
              resultado: 'OK',
              dados: perfil,
              desfecho: 'SOLUCIONADO',
              solucaoId: selecao.solucaoId,
              tipoOcorrencia: selecao.tipoOcorrencia,
            };
          }),
        );
      }),
    );
  }

  /* =======================================================================
   * DESFECHO
   * ===================================================================== */

  private concluir(etapa: Etapa, r: Resultado): void {
    const dados = r.dados ?? this.perfilAtual() ?? '';

    console.log(`${TAG} concluir() → avaliando desfecho`, { etapa, resultado: r, dados });

    if (r.voltarPara) {
      console.log(`${TAG} concluir() → reexecutando etapa`, { voltarPara: r.voltarPara });
      return this.executarEtapa(r.voltarPara);
    }

    if (etapa === 'VERIFICACAO_ANDAMENTO') {
      if (r.resultado === 'ERRO') {
        return this.exibirErro(this.avisoErro(etapa), r, () => this.executarEtapa(etapa));
      }

      if (r.resultado === 'OK') {
        if (r.desfecho === 'SOLUCIONADO') {
          return this.finalizarOcorrencia(dados, r.solucaoId ?? null, r.tipoOcorrencia ?? null);
        }

        if (r.desfecho === 'TRANSFERIR') {
          return this.transferir(dados);
        }

        console.warn(`${TAG} concluir() → OK sem desfecho explícito, encerrando sem transferir`);
        return this.encerrar();
      }

      if (r.sair) {
        return this.exibirCancelamentoESair(etapa, dados);
      }

      return this.exibirCancelamento(etapa, dados);
    }

    if (r.resultado === 'OK') {
      return this.exibirAviso(this.avisoSucesso(etapa), dados, () => {
        this.encerrar();
        this.avancar();
      });
    }

    if (r.resultado === 'ERRO') {
      return this.exibirErro(this.avisoErro(etapa), r, () => this.executarEtapa(etapa));
    }

    this.exibirCancelamento(etapa, dados);
  }

  private finalizarOcorrencia(
    dados: string,
    solucaoId: string | null,
    tipoOcorrenia: TipoOcorrenciaType | null,
  ): void {
    const ocorrencia = this.ocorrencia();
    const autenticado = this.autenticado();

    console.log(`${TAG} finalizarOcorrencia() → finalizando`, {
      ocorrenciaId: ocorrencia?.id ?? null,
      solucaoId,
      dados,
      autenticado: autenticado?.id ?? null,
    });

    if (!ocorrencia) {
      this.encerrar();
      return;
    }

    if (!autenticado) {
      const erro = this.registrarErro(
        { message: 'Usuário não autenticado: não é possível finalizar a ocorrência.' },
        'finalizarOcorrencia',
      );
      this.exibirErro(this.avisoErro('VERIFICACAO_ANDAMENTO'), { erros: [...erro], erro }, () =>
        this.executarEtapa('VERIFICACAO_ANDAMENTO'),
      );
      return;
    }

    if (!solucaoId) {
      const erro = this.registrarErro(
        { message: 'Selecione uma solução antes de finalizar a ocorrência.' },
        'finalizarOcorrencia',
      );
      this.exibirErro(this.avisoErro('VERIFICACAO_ANDAMENTO'), { erros: [...erro], erro }, () =>
        this.executarEtapa('VERIFICACAO_ANDAMENTO'),
      );
      return;
    }

    const form = tipoOcorrenia
      ? this.formFinalizar(solucaoId, autenticado.id, tipoOcorrenia)
      : this.formFinalizar(solucaoId, autenticado.id);

    this.ocorrenciaService
      .atualizar(ocorrencia.id, form)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.alterarAtivoParaParada()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.exibirAviso(FINALIZAR_SUCESSO_FINALIZAR, dados, () => this.encerrar());
              },
              error: (origem) => {
                console.warn(
                  `${TAG} finalizarOcorrencia() → ocorrência finalizada, mas o ativo NÃO foi para PARADA`,
                  origem,
                );
                this.registrarErro(origem, 'finalizarOcorrencia/alterarAtivo');
                this.exibirAviso(FINALIZAR_SUCESSO_FINALIZAR, dados, () => this.encerrar());
              },
            });
        },
        error: (origem) => {
          const erro = this.registrarErro(origem, 'finalizarOcorrencia');
          this.exibirErro(this.avisoErro('VERIFICACAO_ANDAMENTO'), { erros: [...erro], erro }, () =>
            this.executarEtapa('VERIFICACAO_ANDAMENTO'),
          );
        },
      });
  }

  private transferir(dados: string): void {
    const fluxo = this.fluxoOcorrencia();

    if (!fluxo) {
      this.encerrar();
      return;
    }

    const atualizar = {
      condicaoFluxo: CondicaoFluxo.FINALIZADO.valor,
    } as unknown as FluxoOcorrenciaForm;

    this.fluxoOcorrenciaService
      .atualizar(fluxo.id, atualizar)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          console.log(`${TAG} transferir() → fluxo liberado com sucesso`);
          this.exibirAviso(FINALIZAR_SUCESSO_TRANSFERIR, dados, () => {
            this.encerrar();
            this.avancar();
          });
        },
        error: (origem) => {
          const erro = this.registrarErro(origem, 'transferir');
          this.exibirErro(this.avisoErro('VERIFICACAO_ANDAMENTO'), { erros: [...erro], erro }, () =>
            this.executarEtapa('VERIFICACAO_ANDAMENTO'),
          );
        },
      });
  }

  private decidirPerguntaSolucao(d: Desfecho): 'SOLUCIONADO' | 'TRANSFERIR' | 'CANCELOU' | 'ERRO' {
    switch (d.resultado) {
      case 'OK':
        return 'SOLUCIONADO';
      case 'NEUTRO':
        return 'TRANSFERIR';
      case 'ERRO':
        return 'ERRO';
      case 'CANCELOU':
      default:
        return 'CANCELOU';
    }
  }

  /* =======================================================================
   * PRESETS DE AVISO
   * ===================================================================== */

  private avisoSucesso(etapa: Etapa): PresetFinalizar {
    switch (etapa) {
      case 'CADASTRAR_FALHA':
        return FINALIZAR_SUCESSO_REGISTRAR_FALHA;
      case 'VERIFICACAO_INICIAR':
        return FINALIZAR_SUCESSO_INICIAR;
      default:
        return FINALIZAR_SUCESSO_TRANSFERIR;
    }
  }

  private avisoCancelado(etapa: Etapa): PresetFinalizar {
    return etapa === 'CADASTRAR_FALHA'
      ? FINALIZAR_CANCELADO_REGISTRAR_FALHA
      : FINALIZAR_CANCELADO_INICIAR;
  }

  private avisoErro(etapa: Etapa): PresetFinalizar {
    return etapa === 'CADASTRAR_FALHA' ? FINALIZAR_ERRO_REGISTRAR_FALHA : FINALIZAR_ERRO_INICIAR;
  }

  /* =======================================================================
   * MODAIS DE AVISO
   * ===================================================================== */

  private exibirCancelamento(etapa: Etapa, dados?: string): void {
    const preset = this.avisoCancelado(etapa);
    this.exibir({
      ...preset,
      operacao: preset.operacao ?? 'Ok',
      dados,
      erros: [],
    }).subscribe(() => this.encerrar());
  }

  private exibirCancelamentoESair(etapa: Etapa, dados?: string): void {
    const preset = this.avisoCancelado(etapa);
    this.exibir({
      ...preset,
      operacao: preset.operacao ?? 'Ok',
      dados,
      erros: [],
    }).subscribe(() => {
      this.encerrar();
      this.sairDaTela();
    });
  }

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
   * WRAPPERS DOS MODAIS
   * ===================================================================== */

  private pedirCodigo(): Observable<Desfecho> {
    return this.inputService.abrir({ ...INPUT_CODIGO_FALHA }).pipe(
      defaultIfEmpty('cancelado'),
      map((r) => {
        if (r === 'erro') {
          return {
            resultado: 'ERRO' as DesfechoResultado,
            valor: '',
            erro: this.erroDoDialogo(this.inputService, 'pedirCodigo'),
          };
        }

        const valor = typeof r === 'string' && r !== 'cancelado' ? r.trim() : '';
        const resultado = (valor ? 'OK' : 'CANCELOU') as DesfechoResultado;

        return { resultado, valor };
      }),
    );
  }

  private confirmar(config: ConfirmarConfig): Observable<Desfecho> {
    return this.confirmarService.confirmar({ ...config, acao: () => of(true) }).pipe(
      defaultIfEmpty('cancelado'),
      map((r) => this.desfecho(r, this.confirmarService, 'confirmar')),
    );
  }

  /** DialogPin — senha do operador alocado no ativo. Exclusivo do OPERADOR. */
  private pedirPin(config: PinConfig): Observable<Desfecho> {
    const alocacao = this.alocacao();

    console.log(`${TAG} pedirPin() → abrindo DialogPin`, {
      operadorId: alocacao?.operadorId ?? null,
      operadorNome: alocacao?.operador?.nome ?? null,
    });

    if (!alocacao?.operadorId) {
      const erro = this.registrarErro(
        { message: 'Operador não alocado: não é possível validar o PIN.' },
        'pedirPin',
      );
      return of<Desfecho>({ resultado: 'ERRO', erro });
    }

    const cracha = alocacao.operador?.cracha!;
    const empresa = this.terminal()?.empresaId!;

    return this.dialogPin
      .abrir({
        ...config,
        usuario: alocacao.operador?.nome,
        acao: (pin) => this.authService.autenticarAcao({ cracha, pin, empresaId: empresa }),
      })
      .pipe(
        defaultIfEmpty('cancelado'),
        map((r) => this.desfecho(r, this.dialogPin, 'pedirPin')),
      );
  }

  /** DialogoPinComp — crachá + senha. Perfis sem alocação (supervisor, manutenção). */
  private pedirPinComp(config: CredencialConfig): Observable<Desfecho> {
    const empresa = this.terminal()?.empresaId;

    console.log(`${TAG} pedirPinComp() → abrindo DialogoPinComp`, {
      perfilAtuante: this.perfilAtuante(),
      empresaId: empresa ?? null,
    });

    if (!empresa) {
      const erro = this.registrarErro(
        { message: 'Terminal sem empresa vinculada: não é possível validar a credencial.' },
        'pedirPinComp',
      );
      return of<Desfecho>({ resultado: 'ERRO', erro });
    }

    return this.dialogPinComp
      .abrir({
        ...config,
        acao: (credencial) =>
          this.authService.autenticarAcao({
            cracha: credencial.cracha,
            pin: credencial.pin,
            empresaId: empresa,
          }),
      })
      .pipe(
        defaultIfEmpty('cancelado'),
        map((r) => this.desfecho(r, this.dialogPinComp, 'pedirPinComp')),
      );
  }

  private exibir(config: AvisoConfig): Observable<unknown> {
    return this.finalizarRetornoService.finalizar({ ...config, acao: () => of(true) }).pipe(
      defaultIfEmpty(null),
      catchError((origem) => {
        console.log(`${TAG} exibir() → modal falhou, seguindo fluxo`, origem);
        return of(null);
      }),
    );
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
      url: erro.url,
      mensagens: [...erro],
      corpo: erro.corpo,
    });

    logErroApi(`${contexto} · etapa ${this.etapa() ?? 'nenhuma'}`, erro);
    return erro;
  }

  private desfecho(r: unknown, servico?: ServicoDialogo, contexto = 'diálogo'): Desfecho {
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

  private erroDoDialogo(servico: ServicoDialogo, contexto: string): ErroApi | undefined {
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
   * BANCO
   * ===================================================================== */

  private buscarOcorrencia(): Observable<unknown> {
    const query = QUERY.CARREGAR_OCORRENCIA(this.identification());
    return this.ocorrenciaService.buscar(query).pipe(concatMap(() => this.buscarFluxoOcorrencia()));
  }

  private buscarFluxoOcorrencia(): Observable<unknown> {
    const ocorrencia = this.ocorrencia();
    if (!ocorrencia) return EMPTY;

    const query = QUERY.CARREGAR_FLUXO(ocorrencia.id, formataDataLocal(new Date()));

    return this.fluxoOcorrenciaService.buscar(query).pipe(
      catchError((origem) => {
        const erro = this.registrarErro(origem, 'carregarFluxoOcorrencia');
        if (semRegistro(erro)) return of(null);
        return throwError(() => erro);
      }),
    );
  }

  private buscarFalha(codigo: string): Observable<BuscaFalha> {
    return this.falhaService.buscar(QUERY.CARREGAR_FALHA(codigo)).pipe(
      map((resp) => {
        const falha = (Array.isArray(resp) ? resp[0] : resp) as FalhasModel | null | undefined;
        if (falha) return { falha };

        const erro = this.registrarErro(
          { message: `Nenhuma falha cadastrada para o código ${codigo}.` },
          'buscarFalha',
        );
        return { erro };
      }),
      catchError((origem) => of<BuscaFalha>({ erro: this.registrarErro(origem, 'buscarFalha') })),
    );
  }

  private descreverFalha(codigo: string, falha: FalhasModel): string {
    const modelo = falha as { descricao?: string; nome?: string };
    const descricao = modelo.descricao ?? modelo.nome ?? '';
    return descricao ? `Código ${codigo}: ${descricao}` : `Código ${codigo}`;
  }

  private listarSolucoes(falhaId: string): Observable<SolucoesModel[]> {
    const desPerfil = this.perfilAtuante();

    if (!desPerfil) {
      console.log(`${TAG} listarSolucoes() → sem perfil, lista vazia`);
      return of<SolucoesModel[]>([]);
    }

    console.log(`${TAG} listarSolucoes() → consultando`, { falhaId, desPerfil });

    return this.solucoesService.listar(QUERY.CARREGAR_SOLUCAO(falhaId, desPerfil)).pipe(
      map((retorno) => this.normalizarSolucoes(retorno)),
      catchError((origem) => {
        this.registrarErro(origem, 'listarSolucoes');
        return of<SolucoesModel[]>([]);
      }),
    );
  }

  /** Consulta de soluções para o modal de FINALIZAÇÃO — sem catchError. */
  private buscarSolucoesParaFinalizar(falhaId: string): Observable<SolucoesModel[]> {
    const desPerfil = this.perfilAtuante();

    if (!desPerfil) {
      console.log(`${TAG} buscarSolucoesParaFinalizar() → sem perfil, lista vazia`);
      return of<SolucoesModel[]>([]);
    }

    console.log(`${TAG} buscarSolucoesParaFinalizar() → consultando`, { falhaId, desPerfil });

    return this.solucoesService
      .listar(QUERY.CARREGAR_SOLUCAO(falhaId, desPerfil))
      .pipe(map((retorno) => this.normalizarSolucoes(retorno)));
  }

  private paraOpcoes(solucoes: SolucoesModel[]): SolucaoOpcao[] {
    const opcoes: SolucaoOpcao[] = [];

    for (const solucao of solucoes) {
      if (!solucao.id) {
        console.warn(`${TAG} paraOpcoes() → solução sem id descartada`, solucao);
        continue;
      }

      opcoes.push({
        id: solucao.id,
        codigo: solucao.codigo ?? null,
        descricao: solucao.descricao ?? solucao.falha?.descricao ?? '',
      });
    }

    return opcoes;
  }

  /* =======================================================================
   * NORMALIZADORES
   * ===================================================================== */

  private normalizarSolucoes(retorno: unknown): SolucoesModel[] {
    if (Array.isArray(retorno)) return retorno as SolucoesModel[];

    if (retorno && typeof retorno === 'object') {
      const corpo = retorno as { dados?: unknown; data?: unknown };
      if (Array.isArray(corpo.dados)) return corpo.dados as SolucoesModel[];
      if (Array.isArray(corpo.data)) return corpo.data as SolucoesModel[];
    }

    return [];
  }

  private normalizarPerfil(valor: string | null | undefined): string {
    if (!valor) return '';

    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  /* =======================================================================
   * ADAPTADORES DE MODEL
   * ===================================================================== */
  private perfilDoFluxo(fluxo: FluxoOcorrenciaModel | null | undefined): string | null {
    if (!fluxo) return null;

    const modelo = fluxo as unknown as {
      transferidoPerfil?: { descricao?: string } | null;
      perfil?: { descricao?: string } | string | null;
    };

    const transferido = modelo.transferidoPerfil?.descricao ?? null;
    if (transferido) return transferido;

    const perfil = modelo.perfil;
    if (typeof perfil === 'string') return perfil || null;
    return perfil?.descricao ?? null;
  }

  private lerUsuarioDoFluxo(fluxo: FluxoOcorrenciaModel): string | null {
    const f = fluxo as unknown as { usuarioId?: string | null };
    return f.usuarioId ?? null;
  }

  private formFinalizar(
    solucaoId: string,
    solucionadoId: string,
    tipoOcorrencia?: TipoOcorrenciaType,
  ): OcorrenciaForm {
    const form: OcorrenciaForm = { solucaoId, solucionadoId };
    if (tipoOcorrencia) form.tipoOcorrencia = tipoOcorrencia;
    return form;
  }

  private alterarAtivoParaParada(): Observable<unknown> {
    const servico = this.estadoAtivoService as unknown as {
      alterarEstado?: (estado: string) => Observable<unknown>;
    };

    return typeof servico.alterarEstado === 'function' ? servico.alterarEstado('PARADA') : of(null);
  }

  /* =======================================================================
   * PERFIL E CREDENCIAL
   * ===================================================================== */

  /** Ordem: perfil informado → perfil do fluxo → perfil autenticado. */
  private perfilAtuante(perfil?: string | null): string {
    return this.normalizarPerfil(perfil ?? this.perfilAtual() ?? this.perfilOperador());
  }

  /** DialogPin simples = apenas OPERADOR. Demais perfis usam DialogoPinComp. */
  private usaPinSimples(perfil?: string | null): boolean {
    return this.perfilAtuante(perfil) === PERFIL_PIN_SIMPLES;
  }

  /* =======================================================================
   * SAÍDA DA TELA
   * ===================================================================== */

  private sairDaTela(): void {
    window.close();

    window.setTimeout(() => {
      if (!window.closed) {
        console.warn(`${TAG} sairDaTela() → close bloqueado, emitindo (sair) para o host`);
        this.sair.emit();
      }
    }, 300);
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
