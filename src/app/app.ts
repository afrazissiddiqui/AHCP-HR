import { Component, CUSTOM_ELEMENTS_SCHEMA, signal, ChangeDetectionStrategy, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';

type HrMenuOption = {
  label: string;
  value: string;
  icon: string;
  route?: string;
};

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  protected readonly title = signal('SAPQC');
  protected readonly hrDropdownOpen = signal(false);
  protected readonly profileDropdownOpen = signal(false);
  protected readonly selectedHeaderTitle = signal('Home');
  protected readonly hoveredHeaderTitle = signal<string | null>(null);
  protected readonly selectedHrOption = signal<string>('dashboard');
  /** Hide HR shellbar on full-page routes (e.g. login). */
  protected readonly showMainChrome = signal(true);

  @ViewChild('headerWrapper', { read: ElementRef })
  private headerWrapperRef?: ElementRef<HTMLElement>;
  protected readonly shellbarTitle = computed(() => {
    const label = this.hoveredHeaderTitle() ?? this.selectedHeaderTitle();
    return `${label} ▾`;
  });

  protected readonly hrMenuOptions: HrMenuOption[] = [
    { label: 'Home', value: 'dashboard', icon: 'home', route: '/dashboard' },
    { label: 'Recruitment', value: 'recruitment', icon: 'recruiting', route: '/recruitment' },
    { label: 'Employee Action', value: 'employee-action', icon: 'employee', route: '/employee-action' },
    { label: 'Payroll Master', value: 'payroll-master', icon: 'opportunities', route: '/payroll-master' },
    // { label: 'IGP', value: 'gate-pass/igp', icon: 'expense-report', route: '/gate-pass/igp' },
    { label: 'Gate Pass', value: 'gate-pass/ogp', icon: 'shipping-status', route: '/gate-pass' },
    { label: 'Termination', value: 'Termination', icon: 'feedback', },
    { label: 'Continuous Performance', value: 'continuous-performance', icon: 'performance', },
    { label: 'Development', value: 'development', icon: 'learning-assistant', },
    { label: 'Goals', value: 'goals', icon: 'goal', },
    { label: 'Growth Portfolio', value: 'growth-portfolio', icon: 'journey-change', },
    { label: 'Learning', value: 'learning', icon: 'learning-assistant', },
    { label: 'Org Chart', value: 'org-chart', icon: 'org-chart', },
    { label: 'Performance', value: 'performance', icon: 'performance', },
    { label: 'Succession', value: 'succession', icon: 'family-care', },
    { label: 'Sign Out', value: 'login', icon: 'key', route: '/login' },
  ];

  constructor(
    private router: Router,
    private readonly authService: AuthService,
  ) {
    const initialKey = (this.router.url.split('?')[0] ?? '').replace(/^\//, '');
    this.showMainChrome.set(initialKey !== 'login');

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      )
      .subscribe((e) => {
        const url = e.urlAfterRedirects.split('?')[0] ?? '';
        const routeKey = url.replace(/^\//, '');

        const mappedTitle =
          routeKey === 'forms-hub' ? 'All Forms'
            : routeKey === 'login' ? 'Sign in'
            : routeKey === 'profile' ? 'Edit profile'
            : routeKey === 'recruitment/create' ? 'Recruiting'
              : routeKey === 'recruitment' ? 'Recruiting'
                : routeKey === 'employee-action/approval-authority-setup' ? 'Approval Setup'
                  : routeKey.startsWith('employee-action/leave-application-form') ? 'Leave managment'
                  : routeKey.startsWith('employee-action') ? 'Employee Action'
                    : routeKey.startsWith('payroll-master') ? 'Payroll Master'
                      : routeKey.startsWith('gate-pass/ogp') ? 'OGP'
                      : routeKey.startsWith('gate-pass/igp') ? 'IGP'
                      : routeKey.startsWith('gate-pass') ? 'Gate pass'
                      : routeKey.startsWith('job-specification-form') ? 'Job Specification'
                      : routeKey === 'dashboard' ? 'Home'
                        : 'Home';

        this.selectedHeaderTitle.set(mappedTitle);
        this.selectedHrOption.set(routeKey || 'dashboard');
        this.showMainChrome.set(routeKey !== 'login');
        this.profileDropdownOpen.set(false);
      });
  }

  toggleHrDropdown(): void {
    this.profileDropdownOpen.set(false);
    this.hrDropdownOpen.update(state => !state);
  }

  onProfileTriggerClick(event: MouseEvent): void {
    event.stopPropagation();
    this.hrDropdownOpen.set(false);
    this.clearPreviewHrOption();
    this.profileDropdownOpen.update(v => !v);
  }

  onEditProfile(event: Event): void {
    event.stopPropagation();
    this.profileDropdownOpen.set(false);
    void this.router.navigateByUrl('/profile');
  }

  onLogout(event: Event): void {
    event.stopPropagation();
    this.profileDropdownOpen.set(false);
    this.hrDropdownOpen.set(false);
    this.clearPreviewHrOption();
    this.authService.logout();
  }

  onShellbarClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const isBellClick = target.closest('.ui5-shellbar-bell-button');
    const isActionClick = target.closest('.ui5-shellbar-action-button');
    const isSearchClick = target.closest('.ui5-shellbar-search-field-area');
    const isProfileClick = target.closest('[data-profile-btn]');

    if (isBellClick || isActionClick || isSearchClick || isProfileClick) {
      return;
    }

    this.toggleHrDropdown();
  }

  onNotificationsClick(event: Event): void {
    event.stopPropagation();
    this.hrDropdownOpen.set(false);
    this.profileDropdownOpen.set(false);
    this.clearPreviewHrOption();
    void this.router.navigate(['/forms-hub']);
  }

  onProductSwitchClick(event: Event): void {
    event.stopPropagation();
    this.hrDropdownOpen.set(false);
    this.profileDropdownOpen.set(false);
    this.clearPreviewHrOption();
    void this.router.navigate(['/employee-action/approval-authority-setup']);
  }

  previewHrOption(label: string): void {
    this.hoveredHeaderTitle.set(label);
  }

  clearPreviewHrOption(): void {
    this.hoveredHeaderTitle.set(null);
  }

  stopEvent(event: Event): void {
    event.stopPropagation();
  }

  onLogoClick(event: MouseEvent): void {
    event.stopPropagation();
    this.hrDropdownOpen.set(false);
    this.profileDropdownOpen.set(false);
    this.clearPreviewHrOption();
    this.goHome();
  }

  selectHrOption(option: HrMenuOption, event?: Event): void {
    event?.stopPropagation();
    this.hrDropdownOpen.set(false);
    this.profileDropdownOpen.set(false);
    this.selectedHrOption.set(option.value);
    this.selectedHeaderTitle.set(option.label);

    if (option.route) {
      this.router.navigate([option.route]);
    }
  }

  goHome(): void {
    this.router.navigate(['/dashboard']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.hrDropdownOpen() && !this.profileDropdownOpen()) {
      return;
    }
    const wrapper = this.headerWrapperRef?.nativeElement;
    const target = event.target as HTMLElement | null;
    if (!wrapper || !target) {
      return;
    }
    if (!wrapper.contains(target)) {
      this.hrDropdownOpen.set(false);
      this.profileDropdownOpen.set(false);
      this.clearPreviewHrOption();
      return;
    }
    if (this.profileDropdownOpen()) {
      const inProfile =
        target.closest('[data-profile-btn]') || target.closest('.profile-dropdown-menu');
      if (!inProfile) {
        this.profileDropdownOpen.set(false);
      }
    }
  }
}
