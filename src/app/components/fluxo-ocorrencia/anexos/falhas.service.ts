import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { RequestHttp } from '../../../constants/requests.const';

import { FalhasModel, FalhasQuery } from './falhas.model';
import { buildFalhasParams } from './falhas.params';

@Injectable({
  providedIn: 'root',
})
export class FalhasService {
  private http = inject(HttpClient);
  private apiUrl = RequestHttp.falhas;

  private buscarFalhasSignal = signal<FalhasModel | null>(null);
  public buscarFalha = this.buscarFalhasSignal.asReadonly();

  buscar(query: FalhasQuery): Observable<FalhasModel> {
    return this.http
      .get<FalhasModel>(`${this.apiUrl}/unico`, { params: buildFalhasParams(query) })
      .pipe(
        tap((dado) => {
          console.log('[FLUXO]', dado);
          this.buscarFalhasSignal.set(dado);
        }),
        catchError((error) => throwError(() => error)),
      );
  }

  public limparBuscar() {
    this.buscarFalhasSignal.set(null);
  }
}
