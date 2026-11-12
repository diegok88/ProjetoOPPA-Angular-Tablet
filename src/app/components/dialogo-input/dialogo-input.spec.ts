import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogoInput } from './dialogo-input';

describe('DialogoInput', () => {
  let component: DialogoInput;
  let fixture: ComponentFixture<DialogoInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogoInput],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogoInput);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
