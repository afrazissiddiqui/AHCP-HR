import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { App } from './app';
import { LoginComponent } from './components/login/login';
import { AlertService } from './services/alert.service';
import { ApplicationFormService } from './services/application-form.service';
import { AuthService } from './services/auth.service';
import { PermissionService } from './services/permission.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '/',
            events: of(),
            navigate: jasmine.createSpy('navigate'),
            navigateByUrl: jasmine.createSpy('navigateByUrl'),
          },
        },
        {
          provide: AuthService,
          useValue: {
            getSessionUserId: () => 'email@company.com',
            getSessionUser: () => ({ name: 'Afraz Siddiqui' }),
            logout: () => undefined,
          },
        },
        {
          provide: ApplicationFormService,
          useValue: {
            getSignedInUserRecord: () => undefined,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should derive initials from the signed-in user name', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as any;

    expect(app.profileAvatarInitials()).toBe('AS');
  });
});

describe('LoginComponent', () => {
  it('should navigate before refreshing permissions in the background', () => {
    const router = {
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true)),
    };
    const route = {
      snapshot: {
        queryParamMap: {
          get: () => null,
        },
      },
    };
    const alertService = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
      validation: jasmine.createSpy('validation'),
    };
    const authService = {
      loginWithApi: jasmine.createSpy('loginWithApi').and.returnValue(
        of({
          status: true,
          message: 'Welcome',
          token: 'token',
          user: {
            id: 1,
            name: 'Test User',
            email: 'user@example.com',
            email_verified_at: null,
            is_admin: false,
            created_at: '',
            updated_at: '',
            deleted_at: null,
          },
        }),
      ),
      isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(false),
    };
    const permissionService = {
      refreshInBackground: jasmine.createSpy('refreshInBackground').and.callFake(() => {
        order.push('refresh');
      }),
    };

    const order: string[] = [];
    router.navigateByUrl.and.callFake(() => {
      order.push('navigate');
      return Promise.resolve(true);
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: AlertService, useValue: alertService },
        { provide: AuthService, useValue: authService },
        { provide: PermissionService, useValue: permissionService },
      ],
    });

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    component.userId = 'user@example.com';
    component.password = 'Password123';

    component.submit();

    expect(order).toEqual(['navigate', 'refresh']);
  });
});
