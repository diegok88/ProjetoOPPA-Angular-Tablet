import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DialogFinalizarService } from '../../services/dialog-finalizar.service';
import { UpperCasePipe } from '@angular/common';
import { DialogoConfirmarData } from './anexos/dialogo-confirmar.model';
import { extrairMensagens } from '../../util/error-api.util';
import { IconesSvg } from '../icones-svg/icones-svg';

@Component({
  selector: 'app-dialogo-confimar',
  imports: [IconesSvg],
  templateUrl: './dialogo-confimar.html',
  styleUrl: './dialogo-confimar.scss',
})
export class DialogoConfimar {
  public data = inject<DialogoConfirmarData>(DIALOG_DATA);

  private dialogRef = inject(DialogRef<string>);
  private finalizarService = inject(DialogFinalizarService);

  public carregando = signal<boolean>(false);

  public async onConfirmar(): Promise<void> {
    this.carregando.set(true);
    this.finalizarService.limparErros();

    try {
      const acaoFn = this.data.acao();

      if (acaoFn instanceof Promise) await acaoFn;
      else await firstValueFrom(acaoFn);

      this.carregando.set(false);
      this.dialogRef.close('finalizado');
    } catch (error: unknown) {
      this.carregando.set(false);
      this.finalizarService.definirErros(
        extrairMensagens(error, 'Não foi possível confirmar a operação.'),
      );
      this.dialogRef.close('erro');
    }
  }

  public async onNeutro(): Promise<void> {
    if (this.carregando()) return;

    if (!this.data.acaoNeutro) {
      this.dialogRef.close('neutro');
      return;
    }

    this.carregando.set(true);
    this.finalizarService.limparErros();

    try {
      const retorno = this.data.acaoNeutro();

      if (retorno instanceof Promise) await retorno;
      else await firstValueFrom(retorno);

      this.carregando.set(false);
      this.dialogRef.close('neutro');
    } catch (error: unknown) {
      this.carregando.set(false);
      this.finalizarService.definirErros(
        extrairMensagens(error, 'Não foi possível carregar a dica de solução.'),
      );
    }
  }

  public fecharModal(): void {
    if (this.carregando()) return;
    this.dialogRef.close('cancelado');
  }
}
