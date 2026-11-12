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
  | 'block';

@Component({
  selector: 'app-icones-svg',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (nome()) {
      @case ('adicionar') {
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M12 8v8m-4-4h8"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      }
      @case ('editar') {
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4.75 19.25h3.2l10-10a1.7 1.7 0 0 0 0-2.4l-.8-.8a1.7 1.7 0 0 0-2.4 0l-10 10v3.2Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <path d="m13.5 6.5 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      }
      @case ('sucesso') {
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" stroke-width="1.5" />
          <path
            d="m8 12.3 2.6 2.7L16 9.5"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      }
      @case ('erro') {
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" stroke-width="1.5" />
          <path
            d="m9.2 9.2 5.6 5.6m0-5.6-5.6 5.6"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      }
      @case ('cancelar') {
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M5.7 5.7l12.6 12.6"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      }
      @case ('alerta') {
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M10.4 4a1.85 1.85 0 0 1 3.2 0l7.1 12.6a1.85 1.85 0 0 1-1.6 2.8H4.9a1.85 1.85 0 0 1-1.6-2.8L10.4 4Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <path d="M12 9v4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          <circle cx="12" cy="16.2" r="1" fill="currentColor" />
        </svg>
      }
      @case ('pin') {
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect
            x="4.75"
            y="10.25"
            width="14.5"
            height="9.5"
            rx="2.25"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path
            d="M8.25 10V7.75a3.75 3.75 0 0 1 7.5 0V10"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <circle cx="12" cy="15" r="1.4" fill="currentColor" />
        </svg>
      }
      @case ('jornada') {
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M12 7.2V12l3.1 2.1"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      }
      @case ('falha') {
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M10.4 4a1.85 1.85 0 0 1 3.2 0l7.1 12.6a1.85 1.85 0 0 1-1.6 2.8H4.9a1.85 1.85 0 0 1-1.6-2.8L10.4 4Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <path d="M12 9.5v4.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
      }
      @case ('apagar') {
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20.25 5.25h-10.4a1.6 1.6 0 0 0-1.2.55L3.1 11.4a.9.9 0 0 0 0 1.2l5.55 5.6a1.6 1.6 0 0 0 1.2.55h10.4a1.5 1.5 0 0 0 1.5-1.5V6.75a1.5 1.5 0 0 0-1.5-1.5Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <path
            d="m12.4 9.6 4.8 4.8m0-4.8-4.8 4.8"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
      }
      @case ('sync') {
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M21 3v5h-5"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M3 21v-5h5"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      }
      @case ('help') {
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
          <circle cx="12" cy="16.2" r="1" fill="currentColor" />
        </svg>
      }
      @case ('block') {
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M5.5 5.5l13 13"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      }
    }
  `,
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
