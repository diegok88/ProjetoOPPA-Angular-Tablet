import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogoPin } from './dialogo-pin';

describe('DialogoPin', () => {
  let component: DialogoPin;
  let fixture: ComponentFixture<DialogoPin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogoPin],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogoPin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
