import { inject, Injectable, signal } from '@angular/core';
import { RequestHttp } from '../constants/requests.const';
import { HttpClient } from '@angular/common/http';
import { OcorrenciaForm, OcorrenciaModel, OcorrenciaQuery } from '../entities/ocorrencia.model';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { buildOcorrenciaParams } from '../query/ocorrencia.params';

@Injectable({
  providedIn: 'root',
})
export class OcorrenciaService {
  private http = inject(HttpClient);
  private apiUrl = RequestHttp.ocorrencia;

  private buscarOcorrenciaSignal = signal<OcorrenciaModel | null>(null);
  public buscarOcorrencia = this.buscarOcorrenciaSignal.asReadonly();

  atualizar(id: string, dados: OcorrenciaForm): Observable<OcorrenciaModel> { 
    return this.http.patch<OcorrenciaModel>(`${this.apiUrl}/${id}`, dados);
  }

  buscar(query: OcorrenciaQuery): Observable<OcorrenciaModel> {
    return this.http
      .get<OcorrenciaModel>(`${this.apiUrl}/unico`, { params: buildOcorrenciaParams(query) })
      .pipe(
        tap((dado) => {
          this.buscarOcorrenciaSignal.set(dado);
        }),
        catchError((error) => throwError(() => error)),
      );
  }

  limparBuscar(): void {
    this.buscarOcorrenciaSignal.set(null);
  }
}
