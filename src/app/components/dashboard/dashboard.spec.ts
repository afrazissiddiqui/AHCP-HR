import { ComponentFixture, TestBed } from '@angular/core/testing';

import { dashboardComponent } from './dashboard';

describe('Dashboard', () => {
  let component: dashboardComponent;
  let fixture: ComponentFixture<dashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [dashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(dashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
