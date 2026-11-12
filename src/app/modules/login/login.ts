import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CampoLogin, LoginModel } from '../../entities/login.model';

const MSG_LOGIN_PADRAO = 'Falha no login. Verifique suas credenciais.';
const MSG_PERFIL_PADRAO = 'Falha ao carregar perfil. Tente novamente.';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private router = inject(Router);
  private auth = inject(AuthService);

  /** Código do operador: letras e números, sem espaços ou símbolos */
  private readonly alfanumerico = /^[a-zA-Z0-9]+$/;
  /** Código da empresa: somente números */
  private readonly apenasNumeros = /^\d+$/;

  protected loginModel = signal<LoginModel>({ codigo: '', senha: '', codEmpresa: '' });
  protected hide = signal(true);
  protected formSubmitted = signal(false);
  protected carregando = signal(false);
  protected mensagemErro = signal<string | null>(null);

  private touched = signal<Record<CampoLogin, boolean>>({
    codigo: false,
    senha: false,
    codEmpresa: false,
  });

  private campoVisivel(campo: CampoLogin): boolean {
    return this.touched()[campo] || this.formSubmitted();
  }

  protected codigoVazio = computed(
    () => this.campoVisivel('codigo') && !this.loginModel().codigo.trim(),
  );

  protected codigoInvalido = computed(() => {
    const valor = this.loginModel().codigo.trim();
    return this.campoVisivel('codigo') && valor.length > 0 && !this.alfanumerico.test(valor);
  });

  protected senhaVazia = computed(
    () => this.campoVisivel('senha') && !this.loginModel().senha.trim(),
  );

  protected empresaVazia = computed(
    () => this.campoVisivel('codEmpresa') && !this.loginModel().codEmpresa.trim(),
  );

  protected empresaInvalida = computed(() => {
    const valor = this.loginModel().codEmpresa.trim();
    return this.campoVisivel('codEmpresa') && valor.length > 0 && !this.apenasNumeros.test(valor);
  });

  protected onInput(campo: CampoLogin, valor: string): void {
    this.loginModel.update((m) => ({ ...m, [campo]: valor }));
    this.mensagemErro.set(null);
  }

  protected onBlur(campo: CampoLogin): void {
    this.touched.update((t) => ({ ...t, [campo]: true }));
  }

  protected alternarSenha(event: MouseEvent): void {
    event.stopPropagation();
    this.hide.update((v) => !v);
  }

  private formularioValido(): boolean {
    const m = this.loginModel();
    return (
      this.alfanumerico.test(m.codigo.trim()) &&
      !!m.senha.trim() &&
      this.apenasNumeros.test(m.codEmpresa.trim())
    );
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.formSubmitted.set(true);
    this.mensagemErro.set(null);

    if (!this.formularioValido() || this.carregando()) return;

    this.carregando.set(true);
    this.auth.login(this.loginModel()).subscribe({
      next: () => this.carregarPerfil(),
      error: (erros: string[] | undefined) => {
        this.carregando.set(false);
        this.mensagemErro.set(erros?.[0] ?? MSG_LOGIN_PADRAO);
        this.limparSenha();
      },
    });
  }

  private carregarPerfil(): void {
    this.auth.obterPerfil(true).subscribe({
      next: () => {
        this.carregando.set(false);
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      },
      error: () => {
        this.carregando.set(false);
        this.mensagemErro.set(MSG_PERFIL_PADRAO);
      },
    });
  }

  private limparSenha(): void {
    this.loginModel.update((m) => ({ ...m, senha: '' }));
    this.touched.update((t) => ({ ...t, senha: false }));
    this.formSubmitted.set(false);
  }
}
