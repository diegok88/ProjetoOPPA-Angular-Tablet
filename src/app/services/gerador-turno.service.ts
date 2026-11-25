import { inject, Injectable, signal } from '@angular/core';
import { RequestHttp } from '../constants/requests.const';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { AlocacaoOperacionalModel } from '../entities/alocacao-operacional.model';
import { GeradorTurnoModel } from '../entities/gerador-turno.model';

@Injectable({
  providedIn: 'root',
})
export class GeradorTurnoService {
  private http = inject(HttpClient);
  private apiUrl = RequestHttp.gerador_turno;

  private buscarTurnoSignal = signal<GeradorTurnoModel | null>(null);
  public buscarTurnoAtual = this.buscarTurnoSignal.asReadonly();

  buscarTurno(): Observable<GeradorTurnoModel> {
    return this.http.get<GeradorTurnoModel>(`${this.apiUrl}/atual`).pipe(
      tap((dado) => {
        //console.log(dado);
        this.buscarTurnoSignal.set(dado);
      }),
      catchError((error) => throwError(() => error)),
    );
  }
}
