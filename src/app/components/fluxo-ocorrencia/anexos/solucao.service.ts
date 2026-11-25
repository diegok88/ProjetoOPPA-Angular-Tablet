import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { RequestHttp } from '../../../constants/requests.const';
import { buildSolucoesParams } from './solucoes.params';
import { SolucoesModel, SolucoesQuery } from './solucoes.model';

@Injectable({
  providedIn: 'root',
})
export class SolucoesService {
  private http = inject(HttpClient);
  private apiUrl = RequestHttp.solucoes;

  private listarSolucoesSignal = signal<SolucoesModel[]>([]);
  public listarSolucoes = this.listarSolucoesSignal.asReadonly();

  listar(query: SolucoesQuery): Observable<SolucoesModel[]> {
    return this.http
      .get<SolucoesModel[]>(`${this.apiUrl}/listar`, { params: buildSolucoesParams(query) })
      .pipe(
        tap((dado) => {
          console.log('[FLUXO]', dado);
          this.listarSolucoesSignal.set(dado);
        }),
        catchError((error) => throwError(() => error)),
      );
  }

  public limparListar() {
    this.listarSolucoesSignal.set([]);
  }
}
