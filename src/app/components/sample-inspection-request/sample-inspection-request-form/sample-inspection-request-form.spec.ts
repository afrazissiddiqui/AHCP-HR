import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SampleInspectionRequestForm } from './sample-inspection-request-form';

describe('SampleInspectionRequestForm', () => {
  let component: SampleInspectionRequestForm;
  let fixture: ComponentFixture<SampleInspectionRequestForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SampleInspectionRequestForm],
    }).compileComponents();

    fixture = TestBed.createComponent(SampleInspectionRequestForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
