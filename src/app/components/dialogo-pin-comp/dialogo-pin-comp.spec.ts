import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogoPinComp } from './dialogo-pin-comp';

describe('DialogoPinComp', () => {
  let component: DialogoPinComp;
  let fixture: ComponentFixture<DialogoPinComp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogoPinComp],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogoPinComp);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
