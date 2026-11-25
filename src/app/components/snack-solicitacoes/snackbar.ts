import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './snackbar.html',
  styleUrl: './snackbar.scss',
})
export class Snackbar {
  /** Texto exibido no aviso. */
  readonly mensagem = input.required<string>();

  /** Emitido ao clicar no X. */
  readonly fechar = output<void>();
}
