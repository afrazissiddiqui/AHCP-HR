import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationFormService } from './application-form.service';

describe('ApplicationFormService', () => {
  let service: ApplicationFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApplicationFormService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApplicationFormService);
  });

  it('continues from the intended sequence when the list includes a later outlier cluster', () => {
    (service as any).applicationRecords.set([
      { EmployeeCode: 'Emp-00000254' },
      { EmployeeCode: 'Emp-00003312' },
      { EmployeeCode: 'Emp-00003313' },
      { EmployeeCode: 'Emp-00003314' },
    ]);

    expect(service.getNextEmployeeCode()).toBe(255);
  });

  it('normalizes the legacy employee code to the required format', () => {
    expect(service.normalizeEmployeeCodeValue('Emp-00003283')).toBe('Emp-00000254');
  });

  it('remaps the outlier employee codes to the intended sequence', () => {
    expect(service.normalizeEmployeeCodeValue('Emp-00003312')).toBe('Emp-00000255');
    expect(service.normalizeEmployeeCodeValue('Emp-00003313')).toBe('Emp-00000256');
    expect(service.normalizeEmployeeCodeValue('Emp-00003314')).toBe('Emp-00000257');
  });
});
