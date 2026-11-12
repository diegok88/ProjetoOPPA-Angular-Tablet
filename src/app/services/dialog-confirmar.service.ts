import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DialogoConfimar } from '../components/dialogo-confimar/dialogo-confimar';
import { Dialog } from '@angular/cdk/dialog';
import { DialogoConfirmarData } from '../entities/dialogo-confirmar.model';

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
