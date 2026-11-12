import { inject, Injectable, signal } from '@angular/core';
import { RequestHttp } from '../constants/requests.const';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import {
  ControleJornadaForm,
  ControleJornadaModel,
  ControleJornadaQuery,
  PaginatedResponse,
} from '../entities/controle-jornada.model';
import { buildControleJornadaParams } from '../query/controle-jornada.params';

@Injectable({
  providedIn: 'root',
})
export class ControleJornadaService {
  private http = inject(HttpClient);
  private apiUrl = RequestHttp.controle_jornada;

  private readonly buscarControleJornadaSignal = signal<ControleJornadaModel | null>(null);
  readonly buscarControleJornada = this.buscarControleJornadaSignal.asReadonly();

  /** Aceita objeto, array ou envelope paginado e devolve o registro único (o mais recente) */
  private extrairRegistro(dado: unknown): ControleJornadaModel | null {
    if (!dado) return null;
    if (Array.isArray(dado)) {
      console.warn('[service] /unico devolveu ARRAY; usando o último item');
      return dado.length > 0 ? (dado[dado.length - 1] as ControleJornadaModel) : null;
    }
    if (typeof dado === 'object' && 'dados' in dado) {
      const lista = (dado as PaginatedResponse<ControleJornadaModel>).dados;
      console.warn('[service] /unico devolveu PAGINADO; usando o último item');
      return lista.length > 0 ? lista[lista.length - 1] : null;
    }
    return dado as ControleJornadaModel;
  }

  /** Regra do ciclo escrita uma única vez: saída encerra, demais ficam no signal */
  private aplicarCiclo(registro: ControleJornadaModel | null): void {
    console.log('[service] aplicarCiclo recebeu:', registro); // remover após validar
    if (!registro || registro.tipoJornada === 'SAIDA_EXPEDIENTE') {
      this.buscarControleJornadaSignal.set(null);
    } else {
      this.buscarControleJornadaSignal.set(registro);
    }
  }

  /** POST: atualiza o signal direto da resposta, sem esperar um segundo GET */
  cadastrar(payload: ControleJornadaForm): Observable<ControleJornadaModel | null> {
    return this.http.post<ControleJornadaModel>(`${this.apiUrl}`, payload).pipe(
      map((registro) => this.extrairRegistro(registro)),
      tap((registro) => {
        if (registro) this.aplicarCiclo(registro);
      }),
    );
  }

  /** GET puro: normaliza a resposta e trata 404 como null, sem tocar em signal */
  private httpBuscarUnico(query: ControleJornadaQuery): Observable<ControleJornadaModel | null> {
    return this.http
      .get<ControleJornadaModel>(`${this.apiUrl}/unico`, {
        params: buildControleJornadaParams(query),
      })
      .pipe(
        map((dado) => this.extrairRegistro(dado)),
        catchError((error) => {
          if (error.status === 404) return of(null);
          return throwError(() => error);
        }),
      );
  }

  /** Fluxo da jornada: busca e aplica a regra do ciclo no signal */
  buscarUltimoRegistro(query: ControleJornadaQuery): Observable<ControleJornadaModel | null> {
    return this.httpBuscarUnico(query).pipe(tap((dado) => this.aplicarCiclo(dado)));
  }

  /** Cru, para outras telas: retorna o dado, signal intocado */
  consultarUnico(query: ControleJornadaQuery): Observable<ControleJornadaModel | null> {
    return this.httpBuscarUnico(query);
  }

  limparBuscar(): void {
    this.buscarControleJornadaSignal.set(null);
  }
}
