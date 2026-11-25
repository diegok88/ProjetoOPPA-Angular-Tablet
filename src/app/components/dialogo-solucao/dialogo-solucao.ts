import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { DialogFinalizarService } from '../../services/dialog-finalizar.service';
import { extrairMensagens } from '../../util/error-api.util';
import { IconesSvg } from '../icones-svg/icones-svg';
import {
  DialogoSolucaoData,
  RetornoDialogoSolucao,
  SolucaoOcorrencia,
  SolucaoOpcao,
  TIPOS_OCORRENCIA_OPCOES,
  TipoOcorrenciaOpcao,
} from './anexos/dialogo-solucao.model';
import { TipoOcorrencia, TipoOcorrenciaType } from '../fluxo-ocorrencia/anexos/ocorrencia.model';

@Component({
  selector: 'app-dialogo-solucao',
  imports: [IconesSvg],
  templateUrl: './dialogo-solucao.html',
  styleUrl: './dialogo-solucao.scss',
})
export class DialogoSolucao {
  public data = inject<DialogoSolucaoData>(DIALOG_DATA);

  private dialogRef = inject(DialogRef<RetornoDialogoSolucao>);
  private finalizarService = inject(DialogFinalizarService);

  public carregando = signal(false);
  public selecionada = signal('');
  public tipoSelecionado = signal<TipoOcorrenciaType | ''>(this.tipoInicial());

  /** Opções do select de tipo — derivadas do enum, nada hardcoded no template */
  public readonly tipos: TipoOcorrenciaOpcao[] = TIPOS_OCORRENCIA_OPCOES;

  /** Controla a exibição do segundo select */
  public readonly exigeTipo = computed(() => this.data.manutencao === true);

  public readonly labelTipo = computed(() => this.data.labelTipo ?? 'Tipo de ocorrência');
  public readonly placeholderTipo = computed(() => this.data.placeholderTipo ?? 'Selecione o tipo');

  public valido = computed(() => {
    if (!this.data.opcoes?.length) return false;
    if (this.exigeTipo() && !!this.data.obrigatorio && !this.tipoSelecionado()) return false;
    return !this.data.obrigatorio || !!this.selecionada();
  });

  @HostListener('document:keydown', ['$event'])
  protected onTeclado(event: KeyboardEvent): void {
    if (this.carregando()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.fecharModal();
    } else if (event.key === 'Enter' && this.valido()) {
      event.preventDefault();
      this.onConfirmar();
    }
  }

  public rotulo(opcao: SolucaoOpcao): string {
    const codigo =
      opcao.codigo !== null && opcao.codigo !== undefined ? String(opcao.codigo) : null;
    return codigo ? `${codigo} · ${opcao.descricao}` : opcao.descricao;
  }

  public definir(evento: Event): void {
    const alvo = evento.target as HTMLSelectElement;
    this.selecionada.set(alvo.value);
  }

  public definirTipo(evento: Event): void {
    const alvo = evento.target as HTMLSelectElement;
    this.tipoSelecionado.set(alvo.value as TipoOcorrenciaType);
  }

  public async onConfirmar(): Promise<void> {
    if (!this.valido() || this.carregando()) return;

    const solucaoId = this.selecionada();
    if (!solucaoId) return;

    const solucao: SolucaoOcorrencia = {
      solucaoId,
      tipoOcorrencia: this.tipoFinal(),
    };

    if (!this.data.acao) {
      this.dialogRef.close({
        resultado: 'finalizado',
        solucaoId,
        tipoOcorrencia: solucao.tipoOcorrencia,
      });
      return;
    }

    this.carregando.set(true);

    try {
      const acaoFn = this.data.acao(solucao);

      if (acaoFn instanceof Promise) await acaoFn;
      else await firstValueFrom(acaoFn);

      this.carregando.set(false);
      this.dialogRef.close({
        resultado: 'finalizado',
        solucaoId,
        tipoOcorrencia: solucao.tipoOcorrencia,
      });
    } catch (error: unknown) {
      this.carregando.set(false);
      this.finalizarService.definirErros(
        extrairMensagens(error, 'Não foi possível registrar a solução da ocorrência.'),
      );
      this.dialogRef.close('erro');
    }
  }

  public fecharModal(): void {
    if (this.carregando()) return;
    this.dialogRef.close('cancelado');
  }

  /** Tipo usado no envio: o escolhido, senão o padrão, senão o fallback */
  private tipoFinal(): TipoOcorrenciaType {
    return (
      this.tipoSelecionado() ||
      this.data.tipoPadrao ||
      this.data.tipoFallback ||
      TipoOcorrencia.OPERACIONAL.valor
    );
  }

  private tipoInicial(): TipoOcorrenciaType | '' {
    return this.data.manutencao ? this.data.tipoPadrao ?? '' : '';
  }
}
