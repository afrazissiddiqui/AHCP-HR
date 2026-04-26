import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SampleInspectionRequest } from './sample-inspection-request';

describe('SampleInspectionRequest', () => {
  let component: SampleInspectionRequest;
  let fixture: ComponentFixture<SampleInspectionRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SampleInspectionRequest],
    }).compileComponents();

    fixture = TestBed.createComponent(SampleInspectionRequest);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
