import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogoSolucao } from './dialogo-solucao';

describe('DialogoSolucao', () => {
  let component: DialogoSolucao;
  let fixture: ComponentFixture<DialogoSolucao>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogoSolucao],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogoSolucao);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
