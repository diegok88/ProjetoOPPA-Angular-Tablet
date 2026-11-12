import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { IconesSvg } from '../icones-svg/icones-svg';
import { DialogoPinData } from '../../entities/dialogo-pin.model';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';
import { DialogFinalizarService } from '../../services/dialog-finalizar.service';
import { extrairMensagens } from '../../util/error-api.util';

@Component({
  selector: 'app-dialogo-pin',
  imports: [IconesSvg],
  templateUrl: './dialogo-pin.html',
  styleUrl: './dialogo-pin.scss',
})
export class DialogoPin {
  public data = inject<DialogoPinData>(DIALOG_DATA);

  private dialogRef = inject(DialogRef<string>);
  private finalizarService = inject(DialogFinalizarService);

  public carregando = signal<boolean>(false);
  public digitos = signal<string[]>([]);

  /** Teclas de 1 a 9; 0, "C" (limpar) e o ícone de apagar completam o teclado no template. */
  public teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  public tamanhoPin = computed(() => this.data.tamanhoPin ?? 6);
  public posicoes = computed(() =>
    Array.from({ length: this.tamanhoPin() }, (_, indice) => indice),
  );
  public pinCompleto = computed(() => this.digitos().length >= this.tamanhoPin());

  @HostListener('document:keydown', ['$event'])
  protected onTeclado(event: KeyboardEvent): void {
    if (this.carregando()) return;

    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      this.onDigito(event.key);
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      this.onApagar();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.fecharModal('cancelado');
    } else if (event.key === 'Enter' && this.pinCompleto()) {
      event.preventDefault();
      this.onConfirmar();
    }
  }

  public onDigito(digito: string): void {
    if (this.carregando() || this.pinCompleto()) return;
    this.digitos.update((atual) => [...atual, digito]);
  }

  public onApagar(): void {
    if (this.carregando()) return;
    this.digitos.update((atual) => atual.slice(0, -1));
  }

  public onLimpar(): void {
    if (this.carregando()) return;
    this.digitos.set([]);
  }

  public async onConfirmar(): Promise<void> {
    if (!this.pinCompleto() || this.carregando()) return;

    const pin = this.digitos().join('');

    if (!this.data.acao) {
      this.dialogRef.close(pin);
      return;
    }

    this.carregando.set(true);

    try {
      const acaoFn = this.data.acao(pin);

      if (acaoFn instanceof Promise) {
        await acaoFn;
      } else {
        await firstValueFrom(acaoFn);
      }

      this.carregando.set(false);
      this.dialogRef.close('finalizado');
    } catch (error: unknown) {
      this.carregando.set(false);
      this.finalizarService.definirErros(
        extrairMensagens(error, 'Não foi possível validar o PIN.'),
      );
      this.dialogRef.close('erro');
    }
  }

  public fecharModal(confirmado: string): void {
    if (this.carregando()) return;
    this.dialogRef.close(confirmado);
  }
}
