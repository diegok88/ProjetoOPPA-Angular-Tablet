import { Injectable, OnDestroy, computed, signal } from '@angular/core';

export type MachineState = 'Produzindo' | 'Falha' | 'Parado';

export interface OperationInfo {
  cracha: string;
  operador: string;
  turno: string;
  ativo: string;
  modelo: string;
  setor: string;
}

export interface StateDistribution {
  label: MachineState;
  percent: number;
  color: string;
}

export interface StateHistoryItem {
  estado: MachineState;
  inicio: string;
  termino: string;
  duracao: string;
}

export interface OperationalAction {
  label: string;
  icon: 'exit' | 'break' | 'supervisor';
}

@Injectable({ providedIn: 'root' })
export class DashboardService implements OnDestroy {
  readonly operation = signal<OperationInfo>({
    cracha: '6067',
    operador: 'Diego D. K.',
    turno: '3º',
    ativo: 'Carda 1 / CA - 01',
    modelo: 'TC - 11',
    setor: 'Cardas',
  });

  readonly currentState = signal<MachineState>('Produzindo');
  readonly stateSince = signal('18/03/2026 - 04:15');

  /** Duração em segundos; incrementa a cada segundo */
  readonly durationSeconds = signal(1 * 3600 + 15 * 60 + 3);

  readonly distribution = signal<StateDistribution[]>([
    { label: 'Produzindo', percent: 55, color: '#00ff66' },
    { label: 'Falha', percent: 35, color: '#ff4444' },
    { label: 'Parado', percent: 10, color: '#ffcc33' },
  ]);

  readonly actions = signal<OperationalAction[]>([
    { label: 'Sair do Ativo', icon: 'exit' },
    { label: 'Sair para Intervalo', icon: 'break' },
    { label: 'Solicitar Encarregado', icon: 'supervisor' },
  ]);

  readonly history = signal<StateHistoryItem[]>([
    { estado: 'Parado', inicio: '03:10', termino: '03:10', duracao: '0:05:00' },
    { estado: 'Falha', inicio: '03:10', termino: '04:10', duracao: '1:00:00' },
    { estado: 'Produzindo', inicio: '01:40', termino: '03:10', duracao: '1:30:00' },
    { estado: 'Parado', inicio: '01:30', termino: '01:40', duracao: '0:10:00' },
  ]);

  readonly formattedDuration = computed(() => {
    const total = this.durationSeconds();
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  private readonly timer = setInterval(() => this.durationSeconds.update((v) => v + 1), 1000);

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
