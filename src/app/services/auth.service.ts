import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, of, tap } from 'rxjs';
import { RequestHttp } from '../constants/requests.const';
import { AutenticarModel, LoginModel } from '../entities/login.model';
import { AuthResponse } from '../interfaces/auth-response.interface';
import { TOKEN_KEY } from '../constants/auth-token.interceptor';
import { UserGuard } from '../interfaces/user-guard.interface';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = RequestHttp.auth;
  private perfilSignal = signal<UserGuard | null>(null);

  public usuario = this.perfilSignal.asReadonly();
  public role = computed(() => this.perfilSignal()?.desPerfil ?? null);

  private autenticadoSignal = signal<AutenticarModel | null>(null);
  public autenticado = this.autenticadoSignal.asReadonly();

  login(credencial: LoginModel): Observable<AuthResponse> {
    this.perfilSignal.set(null);
    return this.http.post<AuthResponse>(`${this.apiUrl}/login_tag`, credencial).pipe(
      tap((res) => {
        if (res.accessToken) localStorage.setItem(TOKEN_KEY, res.accessToken);
      }),
    );
  }

  logout(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.apiUrl}/logout`, {})
      .pipe(finalize(() => this.limparSessao()));
  }

  autenticarAcao(payload: {
    cracha: number;
    pin: string;
    empresaId: string;
  }): Observable<AutenticarModel> {
    console.log(
      `[AUTH]: usuarioId: ${payload.cracha} | pin :${payload.pin} | empresaId :${payload.empresaId}`,
    );
    return this.http.post<AutenticarModel>(`${this.apiUrl}/autenticar`, payload).pipe(
      tap((resultado) => {
        console.log(`[AUTH]: cracha: ${resultado.cracha} | perfil :${resultado.perfil}`);
        this.autenticadoSignal.set(resultado);
      }),
    );
  }

  obterPerfil(force = false): Observable<UserGuard> {
    if (!force) {
      const cache = this.perfilSignal();
      if (cache) return of(cache);
    }
    return this.http.get<UserGuard>(`${this.apiUrl}/profile`).pipe(
      tap((usuario) => {
        this.perfilSignal.set(usuario);
      }),
    );
  }

  getPerfil(): UserGuard | null {
    return this.perfilSignal();
  }

  getRole(): string | null {
    return this.role();
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private limparSessao(): void {
    this.perfilSignal.set(null);
    this.autenticadoSignal.set(null);
    localStorage.removeItem(TOKEN_KEY);
  }
}
