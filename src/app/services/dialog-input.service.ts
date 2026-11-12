// services/dialog-input.service.ts
import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DialogoInputData, ResultadoDialogoInput } from '../entities/dialogo-input.model';
import { DialogoInput } from '../components/dialogo-input/dialogo-input';

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
