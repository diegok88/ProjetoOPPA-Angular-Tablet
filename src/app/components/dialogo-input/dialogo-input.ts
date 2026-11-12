import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { DialogoInputData, ResultadoDialogoInput } from '../../entities/dialogo-input.model';
import { DialogFinalizarService } from '../../services/dialog-finalizar.service';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';
import { IconesSvg } from '../icones-svg/icones-svg';
import { extrairMensagens } from '../../util/error-api.util';

@Component({
  selector: 'app-dialogo-input',
  imports: [IconesSvg],
  templateUrl: './dialogo-input.html',
  styleUrl: './dialogo-input.scss',
})
export class DialogoInput {
  public data = inject<DialogoInputData>(DIALOG_DATA);

  private dialogRef = inject(DialogRef<ResultadoDialogoInput>);
  private finalizarService = inject(DialogFinalizarService);

  public carregando = signal(false);
  public valor = signal('');

  public valido = computed(() => !this.data.obrigatorio || !!this.valor().trim());

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

  public definir(evento: Event): void {
    const alvo = evento.target as HTMLInputElement;
    const texto = this.data.maiusculo ? alvo.value.toUpperCase() : alvo.value;
    this.valor.set(texto);
  }

  public async onConfirmar(): Promise<void> {
    if (!this.valido() || this.carregando()) return;

    if (!this.data.acao) {
      this.dialogRef.close(this.valor().trim());
      return;
    }

    this.carregando.set(true);

    try {
      const acaoFn = this.data.acao(this.valor().trim());

      if (acaoFn instanceof Promise) await acaoFn;
      else await firstValueFrom(acaoFn);

      this.carregando.set(false);
      this.dialogRef.close('finalizado');
    } catch (error: unknown) {
      this.carregando.set(false);
      this.finalizarService.definirErros(
        extrairMensagens(error, 'Não foi possível validar o código da falha.'),
      );
      this.dialogRef.close('erro');
    }
  }

  public fecharModal(): void {
    if (this.carregando()) return;
    this.dialogRef.close('cancelado');
  }
}
