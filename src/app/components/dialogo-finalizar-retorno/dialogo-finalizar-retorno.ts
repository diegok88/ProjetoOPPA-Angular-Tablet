import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import {
  DialogoFinalizarDataRetorno,
  RESULTADO_FINALIZAR,
  ResultadoFinalizar,
} from '../../entities/dialogo-finalizar.model';
import { IconesSvg } from '../icones-svg/icones-svg';
import { DialogFinalizarRetornoService } from './anexos/dialog-finalizar-retorno.service';

@Component({
  selector: 'app-dialogo-finalizar-retorno',
  imports: [IconesSvg],
  templateUrl: './dialogo-finalizar-retorno.html',
  styleUrl: './dialogo-finalizar-retorno.scss',
})
export class DialogoFinalizarRetorno {
  private finalizarService = inject(DialogFinalizarRetornoService);
  public data = inject<DialogoFinalizarDataRetorno>(DIALOG_DATA);
  private dialogRef = inject<DialogRef<ResultadoFinalizar>>(DialogRef);

  fechar(): void {
    this.finalizarService.limparErros();
    this.dialogRef.close(RESULTADO_FINALIZAR);
  }
}
