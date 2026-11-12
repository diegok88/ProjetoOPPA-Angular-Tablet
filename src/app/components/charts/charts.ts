import { Component, computed, input } from '@angular/core';
import { StateDistribution } from '../../services/dashboard.service';

interface Segment {
  color: string;
  dash: string;
  offset: number;
  label: string;
  percent: number;
}

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [],
  template: `
    <div class="donut-wrapper">
      <svg
        viewBox="0 0 120 120"
        class="donut"
        role="img"
        [attr.aria-label]="'Distribuição de estados'"
      >
        <circle cx="60" cy="60" r="46" class="donut-track" />
        @for (seg of segments(); track seg.label) {
          <circle
            cx="60"
            cy="60"
            r="46"
            class="donut-segment"
            [attr.stroke]="seg.color"
            [attr.stroke-dasharray]="seg.dash"
            [attr.stroke-dashoffset]="seg.offset"
          />
        }
      </svg>
      <ul class="legend">
        @for (seg of segments(); track seg.label) {
          <li>
            <span class="dot" [style.background]="seg.color"></span>
            {{ seg.label }} ({{ seg.percent }}%)
          </li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex: 1;
        min-height: 0;
      }
      .donut-wrapper {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: clamp(0.8rem, 2vw, 1.5rem);
      }
      .donut {
        width: clamp(100px, 24dvh, 150px);
        aspect-ratio: 1 / 1;
        height: auto;
        transform: rotate(-90deg);
        flex-shrink: 0;
      }
      .donut-track {
        fill: none;
        stroke: rgba(255, 255, 255, 0.08);
        stroke-width: 22;
      }
      .donut-segment {
        fill: none;
        stroke-width: 22;
        transition: stroke-dasharray 0.6s ease;
      }
      .legend {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        font-size: clamp(0.85rem, 2.2dvh, 1.05rem);
      }
      .legend li {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
      }
    `,
  ],
})
export class Charts {
  data = input.required<StateDistribution[]>();

  private readonly circumference = 2 * Math.PI * 46;

  segments = computed<Segment[]>(() => {
    let acc = 0;
    return this.data().map((d) => {
      const length = (d.percent / 100) * this.circumference;
      const seg: Segment = {
        color: d.color,
        label: d.label,
        percent: d.percent,
        dash: `${length} ${this.circumference - length}`,
        offset: -acc,
      };
      acc += length;
      return seg;
    });
  });
}