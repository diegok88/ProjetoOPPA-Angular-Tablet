import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DialogoPinData } from '../entities/dialogo-pin.model';
import { DialogoPin } from '../components/dialogo-pin/dialogo-pin';

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
    return dialogRef.closed as Observable<string>;
  }
}
