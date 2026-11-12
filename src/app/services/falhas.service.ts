import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { RequestHttp } from '../constants/requests.const';
import { FalhasModel, FalhasQuery } from '../entities/falhas.model';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { buildFalhasParams } from '../query/falhas.params';

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
          this.buscarFalhasSignal.set(dado);
        }),
        catchError((error) => throwError(() => error)),
      );
  }

  public limparBuscar() {
    this.buscarFalhasSignal.set(null);
  }
}
