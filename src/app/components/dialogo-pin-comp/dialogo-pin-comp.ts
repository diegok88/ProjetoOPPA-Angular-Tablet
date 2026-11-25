import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { extrairMensagens } from '../../util/error-api.util';
import { DialogFinalizarService } from '../../services/dialog-finalizar.service';
import { IconesSvg } from '../icones-svg/icones-svg';
import {
  DialogoCredencialData,
  ResultadoCredencial,
  Credencial,
} from './anexos/dialogo-pin-comp.model';

type CampoAtivo = 'cracha' | 'senha';

@Component({
  selector: 'app-dialogo-pin-comp',
  imports: [IconesSvg],
  templateUrl: './dialogo-pin-comp.html',
  styleUrl: './dialogo-pin-comp.scss',
})
export class DialogoPinComp {
  public data = inject<DialogoCredencialData>(DIALOG_DATA);

  private dialogRef = inject<DialogRef<ResultadoCredencial>>(DialogRef);
  private finalizarService = inject(DialogFinalizarService);

  public carregando = signal<boolean>(false);
  public cracha = signal<number | null>(null);
  public senha = signal<string>('');
  public mostrarSenha = signal<boolean>(false);
  public erros = signal<string[]>([]);
  public shake = signal<boolean>(false);
  public campoAtivo = signal<CampoAtivo>('cracha');

  public readonly teclas: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  public rotuloCracha = computed(() => this.data.rotuloCracha ?? 'Número do crachá');
  public rotuloSenha = computed(() => this.data.rotuloPin ?? 'Senha');

  private minimo = computed(() => this.data.tamanhoMinimoPin ?? 4);
  private maximo = computed(() => this.data.tamanhoMaximoPin ?? 12);
  private crachaNumerico = computed(() => this.data.crachaNumerico !== false);
  private maximoCracha = 20;

  public crachaValido = computed<boolean>(() => {
    const valor = this.cracha();
    return valor !== null && valor > 0;
  });
  public senhaValida = computed(() => this.senha().length >= this.minimo());
  public formularioValido = computed(() => this.crachaValido() && this.senhaValida());

  private inputCracha = viewChild<ElementRef<HTMLInputElement>>('inputCracha');
  private inputSenha = viewChild<ElementRef<HTMLInputElement>>('inputSenha');

  constructor() {
    afterNextRender(() => this.focarCampoAtivo());
  }

  @HostListener('document:keydown', ['$event'])
  protected onTeclado(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !this.carregando()) {
      event.preventDefault();
      this.fecharModal();
    }
  }

  // ── Digitação física ────────────────────────────────────────────────
  public onCracha(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpo = this.sanitizarCracha(input.value);
    const texto = limpo === null ? '' : String(limpo);

    if (input.value !== texto) {
      input.value = texto;
    }

    this.cracha.set(limpo);
    this.erros.set([]);
  }

  public onSenha(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpo = input.value.replace(/\D/g, '').slice(0, this.maximo());

    if (input.value !== limpo) {
      input.value = limpo;
    }

    this.senha.set(limpo);
    this.erros.set([]);
  }

  public focar(campo: CampoAtivo): void {
    this.campoAtivo.set(campo);
  }

  // ── Teclado numérico ────────────────────────────────────────────────
  public digitar(digito: string): void {
    if (this.carregando()) return;

    if (this.campoAtivo() === 'cracha') {
      const atual = this.cracha() === null ? '' : String(this.cracha());
      if (atual.length >= this.maximoCracha) return;

      const numero = this.sanitizarCracha(atual + digito);
      this.cracha.set(numero);
    } else {
      if (this.senha().length >= this.maximo()) return;
      this.senha.update((valor) => valor + digito);
    }

    this.erros.set([]);
    this.focarCampoAtivo();
  }

  public apagar(): void {
    if (this.carregando()) return;

    if (this.campoAtivo() === 'cracha') {
      const atual = this.cracha() === null ? '' : String(this.cracha());
      const resto = atual.slice(0, -1);
      this.cracha.set(resto ? Number(resto) : null);
    } else {
      this.senha.update((valor) => valor.slice(0, -1));
    }

    this.erros.set([]);
    this.focarCampoAtivo();
  }

  public limparCampo(): void {
    if (this.carregando()) return;

    if (this.campoAtivo() === 'cracha') {
      this.cracha.set(null);
    } else {
      this.senha.set('');
    }

    this.erros.set([]);
    this.focarCampoAtivo();
  }

  public alternarSenha(): void {
    if (this.carregando()) return;

    this.mostrarSenha.update((atual) => !atual);

    queueMicrotask(() => {
      const input = this.inputSenha()?.nativeElement;
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      this.campoAtivo.set('senha');
    });
  }

  // ── Confirmação ─────────────────────────────────────────────────────
  public async onConfirmar(event?: Event): Promise<void> {
    event?.preventDefault();

    if (!this.formularioValido() || this.carregando()) return;

    const cracha = this.cracha();
    if (cracha === null) return;

    const credencial: Credencial = {
      cracha,
      pin: this.senha(),
    };

    if (!this.data.acao) {
      this.dialogRef.close('finalizado');
      return;
    }

    this.carregando.set(true);
    this.erros.set([]);

    try {
      const retorno = this.data.acao(credencial);

      if (retorno instanceof Promise) {
        await retorno;
      } else {
        await firstValueFrom(retorno);
      }

      this.carregando.set(false);
      this.dialogRef.close('finalizado');
    } catch (error: unknown) {
      this.carregando.set(false);

      const mensagens = extrairMensagens(error, 'Não foi possível validar as credenciais.');

      this.erros.set(mensagens);
      this.tremer();
      this.finalizarService.definirErros(mensagens);
      this.senha.set('');
      this.focarCampoAtivo();
    }
  }

  public fecharModal(): void {
    if (this.carregando()) return;
    this.dialogRef.close('cancelado');
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  private focarCampoAtivo(): void {
    const ref = this.campoAtivo() === 'cracha' ? this.inputCracha() : this.inputSenha();
    const input = ref?.nativeElement;
    if (!input) return;

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  private sanitizarCracha(valor: string): number | null {
    const digitos = valor.replace(/\D/g, '').slice(0, this.maximoCracha);

    if (!digitos) return null;

    const numero = Number(digitos);
    return Number.isFinite(numero) ? numero : null;
  }

  private tremer(): void {
    this.shake.set(true);
    setTimeout(() => this.shake.set(false), 400);
  }
}
