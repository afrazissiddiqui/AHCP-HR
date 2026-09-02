import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { App } from './app';
import { ApplicationFormService } from './services/application-form.service';
import { AuthService } from './services/auth.service';

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
