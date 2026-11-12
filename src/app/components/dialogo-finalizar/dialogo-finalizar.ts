import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { DialogFinalizarService } from '../../services/dialog-finalizar.service';
import { DialogoFinalizarData } from '../../entities/dialogo-finalizar.model';
import { IconesSvg } from '../icones-svg/icones-svg';

@Component({
  selector: 'app-dialogo-finalizar',
  imports: [IconesSvg],
  templateUrl: './dialogo-finalizar.html',
  styleUrl: './dialogo-finalizar.scss',
})
export class DialogoFinalizar {
  private finalizarService = inject(DialogFinalizarService);
  public data = inject<DialogoFinalizarData>(DIALOG_DATA);
  private dialogRef = inject(DialogRef<boolean>);

  fechar(): void {
    this.finalizarService.limparErros();
    this.dialogRef.close();
  }
}
