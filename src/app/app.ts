import { Component, CUSTOM_ELEMENTS_SCHEMA, signal, ChangeDetectionStrategy, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

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
  protected readonly selectedHeaderTitle = signal('Home');
  protected readonly hoveredHeaderTitle = signal<string | null>(null);
  protected readonly selectedHrOption = signal<string>('dashboard');

  @ViewChild('headerWrapper', { read: ElementRef })
  private headerWrapperRef?: ElementRef<HTMLElement>;

  protected readonly shellbarTitle = computed(() => {
    const label = this.hoveredHeaderTitle() ?? this.selectedHeaderTitle();
    return `${label} ▾`;
  });

  protected readonly hrMenuOptions: HrMenuOption[] = [
    { label: 'Home', value: 'dashboard', icon: 'home', route: '/dashboard' },
    { label: 'Leave managment', value: 'leave-managment/create', icon: 'expense-report', route: '/leave-managment/create' },
    { label: 'Termination', value: 'Termination', icon: 'feedback', },
    { label: 'Continuous Performance', value: 'continuous-performance', icon: 'performance', },
    { label: 'Development', value: 'development', icon: 'learning-assistant', },
    { label: 'Employee Action', value: 'employee-action', icon: 'employee', route: '/employee-action' },
    { label: 'Goals', value: 'goals', icon: 'goal', },
    { label: 'Growth Portfolio', value: 'growth-portfolio', icon: 'journey-change', },
    { label: 'Learning', value: 'learning', icon: 'learning-assistant', },
    { label: 'Opportunity Marketplace', value: 'opportunity-marketplace', icon: 'opportunities', },
    { label: 'Org Chart', value: 'org-chart', icon: 'org-chart', },
    { label: 'Performance', value: 'performance', icon: 'performance', },
    { label: 'Recruitment', value: 'recruitment', icon: 'recruiting', route: '/recruitment' },
    { label: 'Succession', value: 'succession', icon: 'family-care', },
  ];

  constructor(private router: Router) {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      )
      .subscribe((e) => {
        const url = e.urlAfterRedirects.split('?')[0] ?? '';
        const routeKey = url.replace(/^\//, '');

        const mappedTitle =
          routeKey === 'recruitment' ? 'Recruiting'
            : routeKey.startsWith('employee-action') ? 'Employee Action'
            : routeKey === 'dashboard' ? 'Home'
              : 'Home';

        this.selectedHeaderTitle.set(mappedTitle);
        this.selectedHrOption.set(routeKey || 'dashboard');
      });
  }

  toggleHrDropdown(): void {
    this.hrDropdownOpen.update(state => !state);
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
    this.clearPreviewHrOption();
    this.goHome();
  }

  selectHrOption(option: HrMenuOption, event?: Event): void {
    event?.stopPropagation();
    this.hrDropdownOpen.set(false);
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
    if (!this.hrDropdownOpen()) return;
    const wrapper = this.headerWrapperRef?.nativeElement;
    const target = event.target as Node | null;
    if (!wrapper || !target) return;
    if (!wrapper.contains(target)) {
      this.hrDropdownOpen.set(false);
      this.clearPreviewHrOption();
    }
  }
}
