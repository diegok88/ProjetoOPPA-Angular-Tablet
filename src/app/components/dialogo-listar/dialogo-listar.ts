import { Component, inject } from '@angular/core';
import { DialogoListarService } from './anexos/dialogo-listar.service';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DialogoListarData, ResultadoListar } from './anexos/dialogo-listar.model';
import { IconesSvg } from '../icones-svg/icones-svg';

@Component({
  selector: 'app-dialogo-listar',
  imports: [IconesSvg],
  templateUrl: './dialogo-listar.html',
  styleUrl: './dialogo-listar.scss',
})
export class DialogoListar {
  public data = inject<DialogoListarData>(DIALOG_DATA);
  private dialogRef = inject<DialogRef<ResultadoListar>>(DialogRef);
  private finalizarService = inject(DialogoListarService);

  public get itens(): any[] {
    return Array.isArray(this.data?.dados) ? this.data.dados : [];
  }

  public rotulo(item: any): string {
    if (item === null || item === undefined) return '';
    if (typeof item !== 'object') return String(item);

    const campo = this.data.campoRotulo;
    if (campo && item[campo] !== undefined && item[campo] !== null) {
      return String(item[campo]);
    }

    const primeiraChave = Object.keys(item)[0];
    return primeiraChave ? String(item[primeiraChave]) : JSON.stringify(item);
  }

  public detalhe(item: any): string | null {
    if (!item || typeof item !== 'object') return null;

    const campo = this.data.campoDetalhe;
    if (!campo || item[campo] === undefined || item[campo] === null) return null;

    return String(item[campo]);
  }

  public fechar(): void {
    this.finalizarService.limparErros();
    this.dialogRef.close('finalizado');
  }
}
