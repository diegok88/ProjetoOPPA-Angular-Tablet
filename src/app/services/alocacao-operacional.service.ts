import { inject, Injectable, signal } from '@angular/core';
import { RequestHttp } from '../constants/requests.const';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { AlocacaoOperacionalModel } from '../entities/alocacao-operacional.model';

@Injectable({
  providedIn: 'root',
})
export class AlocacaoOperacionalService {
  private http = inject(HttpClient);
  private apiUrl = RequestHttp.alocacao_operacional;

  private buscarAlocOperSignal = signal<AlocacaoOperacionalModel | null>(null);
  public buscarAlocacaoOperacional = this.buscarAlocOperSignal.asReadonly();

  buscarAlocacao(query: string): Observable<AlocacaoOperacionalModel> {
    return this.http.get<AlocacaoOperacionalModel>(`${this.apiUrl}/allocation?${query}`).pipe(
      tap((dado) => {
        console.log(dado);
        this.buscarAlocOperSignal.set(dado);
      }),
      catchError((error) => throwError(() => error)),
    );
  }

  public limparBuscar() {
    this.buscarAlocOperSignal.set(null);
  }
}
