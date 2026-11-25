import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Dialog } from '@angular/cdk/dialog';
import { DialogoConfirmarData } from './dialogo-confirmar.model';
import { DialogoConfimar } from '../dialogo-confimar';

@Injectable({
  providedIn: 'root',
})
export class DialogConfirmarService {
  private dialog = inject(Dialog);

  confirmar<T>(config: DialogoConfirmarData<T>): Observable<string> {
    const dialogRef = this.dialog.open<string>(DialogoConfimar, {
      data: config,
      disableClose: true,
    });
    return dialogRef.closed as Observable<string>;
  }
}
