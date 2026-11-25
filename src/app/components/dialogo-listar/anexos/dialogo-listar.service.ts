import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DialogoListarData, ResultadoListar } from './dialogo-listar.model';
import { DialogoListar } from '../dialogo-listar';

@Injectable({
  providedIn: 'root',
})
export class DialogoListarService {
  private dialog = inject(Dialog);

  private errosSignal = signal<string[]>([]);
  public ultimosErros = this.errosSignal.asReadonly();

  public definirErros(erros: string[]): void {
    this.errosSignal.set(erros);
  }

  public limparErros(): void {
    this.errosSignal.set([]);
  }

  listar<T = any>(config: DialogoListarData<T>): Observable<ResultadoListar> {
    const dialogRef = this.dialog.open(DialogoListar, {
      data: {
        operacao: 'Ok',
        ...config,
        erros: config.erros ?? this.ultimosErros(),
      },
      disableClose: true,
    });

    return dialogRef.closed as Observable<ResultadoListar>;
  }
}
