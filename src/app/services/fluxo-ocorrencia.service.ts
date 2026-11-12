import { inject, Injectable, signal } from '@angular/core';
import { RequestHttp } from '../constants/requests.const';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import {
  FluxoOcorrenciaForm,
  FluxoOcorrenciaModel,
  FluxoOcorrenciaQuery,
} from '../entities/fluxo-ocorrencia.model';
import { buildFluxoOcorrenciaParams } from '../query/fluxo-ocorrencia.params';

@Injectable({
  providedIn: 'root',
})
export class FluxoOcorrenciaService {
  private http = inject(HttpClient);
  private apiUrl = RequestHttp.fluxo_ocorrencia;

  private buscarFluxoOcorrenciaSignal = signal<FluxoOcorrenciaModel | null>(null);
  public buscarFluxoOcorrencia = this.buscarFluxoOcorrenciaSignal.asReadonly();

  atualizar(id: string, dados: FluxoOcorrenciaForm): Observable<FluxoOcorrenciaModel> {
    return this.http.patch<FluxoOcorrenciaModel>(`${this.apiUrl}/${id}`, dados);
  }

  buscar(query: FluxoOcorrenciaQuery): Observable<FluxoOcorrenciaModel> {
    return this.http
      .get<FluxoOcorrenciaModel>(`${this.apiUrl}/unico`, {
        params: buildFluxoOcorrenciaParams(query),
      })
      .pipe(
        tap((dado) => {
          this.buscarFluxoOcorrenciaSignal.set(dado);
        }),
        catchError((error) => throwError(() => error)),
      );
  }

  limparBuscar(): void {
    this.buscarFluxoOcorrenciaSignal.set(null);
  }
}
