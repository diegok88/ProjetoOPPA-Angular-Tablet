import { computed, inject, Injectable, NgZone, OnDestroy, signal } from '@angular/core';
import { EstadoAtivoModel } from '../entities/estado-ativo.model';
import { AuthService } from './auth.service';
import { NotificationService } from './notificacation.service';
import { ErrorMessageService } from './error-massege.service';
import { io, Socket } from 'socket.io-client';
import { environment } from '../constants/environment.const';
import { RespostaErro } from '../interfaces/respostaErro.interface';

/** Formato enviado pelo back em 'estadoAtivoTrocado' */
export interface EstadoTrocado {
  ativo: string; // tagAtivoId
  anterior: EstadoAtivoModel | null;
  atual: EstadoAtivoModel;
}

/** Formato enviado pelo back em 'cronometroTick' */
export interface CronometroTick {
  ativo: string; // tagAtivoId
  id: string;
  tipoEstado: string;
  tempo: number;
}

export interface EstadoContador {
  total: number;
  produzindo: number;
  parado: number;
  falha: number;
}

@Injectable({ providedIn: 'root' })
export class EstadoAtivoService implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly errorMessage = inject(ErrorMessageService);

  private socket: Socket | null = null;
  private relogio: ReturnType<typeof setInterval> | null = null;

  private ativoTerminal: string | null = null;
  private querLista = false;

  private readonly conectadoSignal = signal(false);
  private readonly listaSignal = signal<EstadoAtivoModel[]>([]);
  private readonly estadoClienteSignal = signal<EstadoAtivoModel | null>(null);
  private readonly historicoSignal = signal<EstadoAtivoModel[]>([]);
  private readonly temposSignal = signal<Record<string, number>>({});

  /** Relógio local: usado só enquanto nenhum tick do servidor chegou */
  readonly agora = signal(Date.now());

  readonly isConectado = this.conectadoSignal.asReadonly();
  readonly listaEstadosAtivos = this.listaSignal.asReadonly();
  readonly estadoAtivoCliente = this.estadoClienteSignal.asReadonly();
  readonly historicoEstadoAtivo = this.historicoSignal.asReadonly();
  readonly totalAtivos = computed(() => this.listaSignal().length);

  private readonly contadorSignal = signal<EstadoContador | null>(null);
  readonly contadorEstados = this.contadorSignal.asReadonly();

  constructor() {
    this.iniciarRelogio();
  }

  /**
   * Abre a conexão uma vez. Várias telas podem chamar: se o socket já existir,
   * apenas garante a conexão e, se preciso, pede a lista.
   */
  conectar(opcoes: { lista?: boolean } = {}): void {
    if (opcoes.lista) {
      this.querLista = true;
      if (this.socket?.connected) this.listarEstadosAtivos();
    }

    const token = this.auth.getToken();
    if (!token) return;

    if (this.socket) {
      const authAntigo = (this.socket.auth as { token?: string } | undefined)?.token;
      if (authAntigo !== token) {
        this.socket.disconnect();
        this.socket = null;
      } else {
        if (!this.socket.connected) this.socket.connect();
        return;
      }
    }

    this.socket = io(`${environment.apiUrl}/estado-ativo`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        this.conectadoSignal.set(true);
        if (this.querLista) this.listarEstadosAtivos();
        this.notification.showSuccess('Conectado ao servidor.');
      });
    });

    // Erro de handshake fica visível em vez de falhar em silêncio
    this.socket.on('connect_error', (err: Error) => {
      this.ngZone.run(() => {
        this.conectadoSignal.set(false);
        this.notification.showError('Falha na conexão: ' + err.message);
      });
    });

    this.socket.on('disconnect', () => {
      this.ngZone.run(() => {
        this.conectadoSignal.set(false);
        this.notification.showWarning('Conexão perdida com o servidor.');
      });
    });

    // Chega depois que o servidor colocou o socket na sala do ativo
    this.socket.on('ativoIdentificado', (dado: { ativo: string | null }) => {
      this.ngZone.run(() => {
        this.ativoTerminal = dado.ativo;
      });
    });

    this.socket.on('estadoAtivoAtual', (estado: EstadoAtivoModel | null) => {
      this.ngZone.run(() => this.estadoClienteSignal.set(estado ?? null));
    });

    this.socket.on('estadoAtivoTrocado', (troca: EstadoTrocado) => {
      this.ngZone.run(() => this.aplicarTroca(troca));
    });

    this.socket.on('cronometroTick', (t: CronometroTick) => {
      this.ngZone.run(() => {
        this.temposSignal.update((m) => ({ ...m, [t.ativo]: t.tempo }));
      });
    });

    // O servidor empurra o histórico atualizado a cada troca de estado
    this.socket.on('historicoAtualizado', (lista: EstadoAtivoModel[]) => {
      this.ngZone.run(() => this.historicoSignal.set(lista ?? []));
    });

    this.socket.on('estadoContador', (c: EstadoContador) => {
      this.ngZone.run(() => this.contadorSignal.set(c));
    });

    this.socket.on('error_response', (data: RespostaErro) => {
      this.ngZone.run(() => {
        const code = data.errorCode || 'UNKNOWN';
        const padrao = data.message || this.errorMessage.getGenericMessage();
        this.notification.showError(this.errorMessage.getUserMessage(code, padrao));
      });
    });
  }

  /** Chamar quando o token for renovado: troca a autenticação sem recriar as telas */
  reconectar(novoToken: string): void {
    if (!this.socket) return;
    this.socket.auth = { token: novoToken };
    this.socket.disconnect().connect();
  }

  desconectar(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.ativoTerminal = null;
    this.querLista = false;
    this.conectadoSignal.set(false);
  }

  /** Dispositivo registra uma mudança de estado */
  inserirEstado(tipoEstado: string): void {
    if (!this.socket?.connected) {
      this.notification.showError('Não conectado ao servidor.');
      return;
    }
    this.socket.emit('createEstadoAtivo', { tipoEstado });
  }

  listarEstadosAtivos(): void {
    if (!this.socket?.connected) return;
    this.socket.emit('listarEstadoAtivos', (lista: EstadoAtivoModel[] | null) => {
      this.ngZone.run(() => this.listaSignal.set(lista ?? []));
    });
  }

  /** Estado aberto do ativo do terminal */
  buscarEstadoAtivoCliente(): void {
    if (!this.socket?.connected) return;
    this.socket.emit('buscarEstadoAtivoCliente', (estado: EstadoAtivoModel | null) => {
      this.ngZone.run(() => {
        this.estadoClienteSignal.set(estado ?? null);
      });
    });
  }

  /** Histórico do dia/turno sob demanda (carga inicial e reconexões) */
  buscarHistorico(): void {
    if (!this.socket?.connected) return;
    this.socket.emit('historicoEstadoAtivo', (lista: EstadoAtivoModel[] | null) => {
      this.ngZone.run(() => this.historicoSignal.set(lista ?? []));
    });
  }

  /**
   * Segundos decorridos. Usa o valor do servidor quando existir; antes do
   * primeiro tick, calcula a partir de dataInicial.
   */
  tempoDecorrido(estado: EstadoAtivoModel | null | undefined): number {
    if (!estado) return 0;
    if (!estado.status) return estado.duracao ?? 0;

    const doServidor = this.temposSignal()[estado.tagAtivoId];
    if (doServidor !== undefined) return doServidor;

    const inicio = new Date(estado.dataInicial).getTime();
    return Math.max(0, Math.floor((this.agora() - inicio) / 1000));
  }

  private aplicarTroca({ ativo, atual }: EstadoTrocado): void {
    // Zera o tempo antigo do ativo para o novo estado não mostrar o valor anterior
    const tempos = { ...this.temposSignal() };
    delete tempos[ativo];
    this.temposSignal.set(tempos);

    // Lista da supervisão: um estado aberto por ativo
    const outros = this.listaSignal().filter((e) => e.tagAtivoId !== ativo);
    this.listaSignal.set([...outros, atual]);

    // Terminal: só atualiza quando a troca é do próprio ativo
    if (ativo === this.ativoTerminal) {
      this.estadoClienteSignal.set(atual);
    }
  }

  private iniciarRelogio(): void {
    this.ngZone.runOutsideAngular(() => {
      this.relogio = setInterval(() => {
        this.ngZone.run(() => this.agora.set(Date.now()));
      }, 1000);
    });
  }

  buscarContadorEstado(): void {
    if (!this.socket?.connected) return;
    this.socket.emit('buscarContadorEstado', (c: EstadoContador | null) => {
      this.ngZone.run(() => this.contadorSignal.set(c ?? null));
    });
  }

  ngOnDestroy(): void {
    if (this.relogio) clearInterval(this.relogio);
    this.desconectar();
  }

  /** Id do estado atual em tempo real do ativo desta conexão */
  readonly identificationState = computed<string>(() => {
    const estado = this.estadoClienteSignal();
    return estado?.id ?? '';
  });

  /** Estado atual em tempo real do ativo desta conexão */
  readonly currentState = computed<string>(() => {
    const estado = this.estadoClienteSignal();
    return estado?.tipoEstado ?? 'SEM ESTADO';
  });

  /** Desde quando o estado atual está ativo (formatado) */
  readonly stateSince = computed<string>(() => {
    const estado = this.estadoClienteSignal();
    if (!estado) return '--';
    return new Date(estado.dataInicial).toLocaleString('pt-BR');
  });

  /** Duração formatada, atualizada a cada tick/relogio */
  readonly formattedDuration = computed<string>(() => {
    return this.formatarTempo(this.tempoDecorrido(this.estadoClienteSignal()));
  });

  /** Tipo do estado atual, para classes CSS */
  readonly tipoEstadoAtual = computed<string>(() => {
    return this.estadoClienteSignal()?.tipoEstado ?? '';
  });

  private formatarTempo(segundos: number): string {
    if (isNaN(segundos)) return '00:00:00';
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    const mm = minutos.toString().padStart(2, '0');
    const ss = segs.toString().padStart(2, '0');
    return horas > 0 ? `${horas.toString().padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
  }
}
