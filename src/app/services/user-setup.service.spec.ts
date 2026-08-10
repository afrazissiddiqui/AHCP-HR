import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserSetupService } from './user-setup.service';

describe('UserSetupService', () => {
  let service: UserSetupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserSetupService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(UserSetupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('includes employee code, branch and department in the serialized user payload', () => {
    service.addUser({
      name: 'Test-user',
      email: 'testuser@gmail.com',
      password: '123456',
      employee_code: 'Emp-00003290',
      branch: [1, 3],
      department: 25,
      authorization: [],
    }).subscribe();

    const req = httpMock.expectOne((request) => request.url.includes('user-add'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(jasmine.objectContaining({
      name: 'Test-user',
      email: 'testuser@gmail.com',
      password: '123456',
      employee_code: 'Emp-00003290',
      branch: [1, 3],
      department: 25,
    }));

    req.flush({ success: true });
  });
});
