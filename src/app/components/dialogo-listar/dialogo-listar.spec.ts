import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogoListar } from './dialogo-listar';

describe('DialogoListar', () => {
  let component: DialogoListar;
  let fixture: ComponentFixture<DialogoListar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogoListar],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogoListar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
