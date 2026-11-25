// services/dialog-input.service.ts
import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { DialogoInput } from '../dialogo-input';
import { DialogoInputData, ResultadoDialogoInput } from './dialogo-input.model';

@Injectable({ providedIn: 'root' })
export class DialogInputService {
  private dialog = inject(Dialog);

  abrir(config: DialogoInputData): Observable<ResultadoDialogoInput> {
    const dialogRef = this.dialog.open<ResultadoDialogoInput>(DialogoInput, {
      data: config,
      disableClose: true,
    });
    return dialogRef.closed as Observable<ResultadoDialogoInput>;
  }
}
