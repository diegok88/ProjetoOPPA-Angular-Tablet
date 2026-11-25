import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoricoSolicitacoes } from './historico-solicitacoes';

describe('HistoricoSolicitacoes', () => {
  let component: HistoricoSolicitacoes;
  let fixture: ComponentFixture<HistoricoSolicitacoes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoricoSolicitacoes],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoricoSolicitacoes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
