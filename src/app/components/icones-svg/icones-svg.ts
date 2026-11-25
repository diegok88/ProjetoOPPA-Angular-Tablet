import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type Icone =
  | 'adicionar'
  | 'editar'
  | 'sucesso'
  | 'erro'
  | 'cancelar'
  | 'alerta'
  | 'pin'
  | 'jornada'
  | 'falha'
  | 'apagar'
  | 'sync'
  | 'help'
  | 'block'
  | 'nao_autorizado'
  | 'olho'
  | 'olho-fechado'
  | 'solucao';

@Component({
  selector: 'app-icones-svg',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icones-svg.html',
  styles: `
    :host {
      display: inline-flex;
      width: 1em;
      height: 1em;
      flex-shrink: 0;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class IconesSvg {
  public nome = input.required<Icone>();
}
