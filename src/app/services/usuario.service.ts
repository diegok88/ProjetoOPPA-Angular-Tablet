import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { RequestHttp } from '../constants/requests.const';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { UsuarioModel } from '../entities/usuario.model';
import { PinModel, SenhaModel } from '../entities/credenciais.model';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private http = inject(HttpClient);
  private apiUrl = RequestHttp.usuario;

  private listarUsuarioSignal = signal<UsuarioModel[] | []>([]);
  public listarUsuario = this.listarUsuarioSignal.asReadonly();

  private buscarUsuarioSignal = signal<UsuarioModel | null>(null);
  public buscarUsuario = this.buscarUsuarioSignal.asReadonly();

  trocarSenha(dados: SenhaModel): Observable<SenhaModel> {
    return this.http.patch<SenhaModel>(`${this.apiUrl}/password`, dados);
  }
  trocarPin(dados: PinModel): Observable<PinModel> {
    return this.http.patch<PinModel>(`${this.apiUrl}/pin`, dados);
  }
  listar(): Observable<UsuarioModel[]> {
    return this.http.get<UsuarioModel[]>(this.apiUrl).pipe(
      tap((dados) => {
        this.listarUsuarioSignal.set(dados);
      }),
      catchError((error) => throwError(() => error)),
    );
  }
  buscar(id: string): Observable<UsuarioModel> {
    return this.http.get<UsuarioModel>(`${this.apiUrl}/${id}`).pipe(
      tap((dado) => {
        this.buscarUsuarioSignal.set(dado);
      }),
      catchError((error) => throwError(() => error)),
    );
  }
  public limparTodos() {
    this.buscarUsuarioSignal.set(null);
    this.listarUsuarioSignal.set([]);
  }
  public limparListar() {
    this.listarUsuarioSignal.set([]);
  }
  public limparBuscar() {
    this.buscarUsuarioSignal.set(null);
  }
}
