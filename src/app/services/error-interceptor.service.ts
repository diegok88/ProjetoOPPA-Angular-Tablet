import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { logErroApi, normalizarErro } from '../util/error-api.util';

@Injectable({
  providedIn: 'root',
})
export class ErrorInterceptorService implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((origem: unknown) => {
        const erro = normalizarErro(origem, 'Erro inesperado na requisição.');

        logErroApi(`${req.method} ${req.urlWithParams}`, erro);

        // Sobe ainda como string[] (compatível), mas com status e corpo anexados.
        return throwError(() => erro);
      }),
    );
  }
}
