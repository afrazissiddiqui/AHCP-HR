import { CommonModule } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  effect,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of, take } from 'rxjs';
import { ApplicationFormRecord } from '../../services/application-form.service';
import { ApplicationFormService } from '../../services/application-form.service';
import { AuthService } from '../../services/auth.service';
import {
  buildProfileSpotlight,
  skillRadarPoints,
} from './profile-spotlight.util';

@Component({
  selector: 'app-view-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-profile.html',
  styleUrls: ['./view-profile.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewProfileComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly open = input(false);
  readonly closed = output<void>();

  protected readonly bioExpanded = signal(false);
  protected readonly profileLoading = signal(false);
  protected readonly profileFetchRequested = signal(false);

  protected readonly profileRecord = computed(() =>
    this.applicationFormService.getSignedInUserRecord(this.authService.getSessionUserId())
  );

  protected readonly spotlight = computed(() => {
    const record = this.profileRecord();
    return record ? buildProfileSpotlight(record) : null;
  });

  protected readonly radarPoints = computed(() => {
    const skills = this.spotlight()?.skills ?? [];
    return skillRadarPoints(skills);
  });

  protected readonly localTime = computed(() => {
    const formatted = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());
    return `${formatted} (Local Time)`;
  });

  protected readonly avatarInitials = computed(() => {
    const name = this.profileRecord()?.EmployeeName?.trim() ?? '';
    return this.initialsFromName(name, 'UI');
  });

  constructor(
    private readonly router: Router,
    private readonly applicationFormService: ApplicationFormService,
    private readonly authService: AuthService
  ) {
    effect(() => {
      const isOpen = this.open();
      this.document.documentElement.classList.toggle('profile-drawer-open', isOpen);
      if (!isOpen) {
        this.bioExpanded.set(false);
        return;
      }
      this.loadSignedInUserProfile();
    });
    this.destroyRef.onDestroy(() => {
      this.document.documentElement.classList.remove('profile-drawer-open');
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.close();
    }
  }

  protected close(): void {
    this.closed.emit();
  }

  protected openFullProfile(): void {
    this.close();
    void this.router.navigateByUrl('/profile');
  }

  protected toggleBio(): void {
    this.bioExpanded.update((v) => !v);
  }

  private loadSignedInUserProfile(): void {
    const userId = this.authService.getSessionUserId();
    if (!userId?.trim()) {
      return;
    }
    if (this.profileRecord()) {
      return;
    }
    if (this.profileFetchRequested()) {
      return;
    }
    if (this.applicationFormService.getApplicationRecords().length > 0) {
      return;
    }

    this.profileFetchRequested.set(true);
    this.profileLoading.set(true);

    this.applicationFormService
      .fetchEmployeeProfiles()
      .pipe(
        take(1),
        catchError(() => of([])),
      )
      .subscribe({
        next: () => this.profileLoading.set(false),
        error: () => this.profileLoading.set(false),
      });
  }

  protected managerInitials(record: ApplicationFormRecord): string {
    return this.initialsFromName(record.ReportingManager?.trim() ?? '', 'M');
  }

  protected field(record: ApplicationFormRecord | undefined, getter: (r: ApplicationFormRecord) => string): string {
    if (!record) {
      return '—';
    }
    const value = getter(record).trim();
    return value || '—';
  }

  protected loginField(
    record: ApplicationFormRecord | undefined,
    key: 'userId' | 'employeeName' | 'employeeCode' | 'password'
  ): string {
    const value = record?.detail?.loginDetails[key];
    if (key === 'password') {
      return value ? '••••••••' : '—';
    }
    return (value ?? '').toString().trim() || '—';
  }

  private initialsFromName(name: string, fallback: string): string {
    if (!name) {
      return fallback;
    }
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}
