import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DialogoCredencialData, ResultadoCredencial } from './dialogo-pin-comp.model';
import { DialogoPinComp } from '../dialogo-pin-comp';

@Injectable({
  providedIn: 'root',
})
export class DialogoPinCompService {
  private dialog = inject(Dialog);

  abrir(config: DialogoCredencialData): Observable<ResultadoCredencial> {
    const dialogRef = this.dialog.open<ResultadoCredencial, DialogoCredencialData>(DialogoPinComp, {
      data: {
        tamanhoMinimoPin: 1,
        tamanhoMaximoPin: 12,
        crachaNumerico: true,
        ...config,
      },
      disableClose: true,
      autoFocus: false,
      panelClass: 'dialogo-pin-panel',
    });

    return dialogRef.closed as Observable<ResultadoCredencial>;
  }
}
