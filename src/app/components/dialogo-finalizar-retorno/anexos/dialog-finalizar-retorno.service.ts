import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DialogoFinalizarDataRetorno } from './dialogo-finalizar-retorno.model';
import { ResultadoFinalizar } from '../../../entities/dialogo-finalizar.model';
import { DialogoFinalizarRetorno } from '../dialogo-finalizar-retorno';

@Injectable({
  providedIn: 'root',
})
export class DialogFinalizarRetornoService {
  private dialog = inject(Dialog);

  private errosSignal = signal<string[]>([]);
  public ultimosErros = this.errosSignal.asReadonly();

  public definirErros(erros: string[]) {
    this.errosSignal.set(erros);
  }

  public limparErros() {
    this.errosSignal.set([]);
  }

  finalizar<T>(config: DialogoFinalizarDataRetorno<T>): Observable<ResultadoFinalizar> {
    const dialogRef = this.dialog.open(DialogoFinalizarRetorno, {
      data: {
        ...config,
        erros: config.erros ?? this.ultimosErros(),
      },
      disableClose: true,
    });
    return dialogRef.closed as Observable<ResultadoFinalizar>;
  }
}
