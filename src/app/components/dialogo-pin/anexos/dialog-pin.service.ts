import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { DialogoPin } from '../dialogo-pin';
import { DialogoPinData } from './dialogo-pin.model';

@Injectable({
  providedIn: 'root',
})
export class DialogPinService {
  private dialog = inject(Dialog);

  abrir(config: DialogoPinData): Observable<string> {
    const dialogRef = this.dialog.open<string>(DialogoPin, {
      data: {
        tamanhoPin: 4,
        ...config,
      },
      disableClose: true,
    });
    return dialogRef.closed.pipe(map((resultado) => resultado ?? 'cancelado'));
  }
}
