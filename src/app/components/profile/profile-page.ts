import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApplicationFormRecord } from '../../services/application-form.service';
import { AlertService } from '../../services/alert.service';
import { ApplicationFormService } from '../../services/application-form.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-page.html',
  styleUrls: [
    '../HR-Portal/Application-Form/create-job-requisition/create-job-requisition.css',
    './profile-page.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');

  protected readonly profileRecord = computed(() =>
    this.applicationFormService.getSignedInUserRecord(
      this.authService.getSessionUserId(),
      this.authService.getSessionUser()?.name ?? null,
    )
  );

  protected readonly displaySalary = computed(() => {
    const record = this.profileRecord();
    if (!record?.detail) {
      return '—';
    }
    const basicSalary = record.detail.remuneration?.basicSalary?.trim();
    if (basicSalary) {
      return `PKR ${basicSalary}`;
    }
    const lastExp = record.detail.pastExperience.at(-1);
    if (lastExp?.lastSalary?.trim()) {
      return `PKR ${lastExp.lastSalary}`;
    }
    return '—';
  });

  protected readonly avatarInitials = computed(() => {
    const name = this.profileRecord()?.EmployeeName?.trim() ?? '';
    if (!name) {
      return 'UI';
    }
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  constructor(
    private readonly router: Router,
    private readonly applicationFormService: ApplicationFormService,
    private readonly authService: AuthService,
    private readonly alertService: AlertService
  ) {}

  protected back(): void {
    void this.router.navigateByUrl('/dashboard');
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

  protected async changePassword(): Promise<void> {
    const next = this.newPassword().trim();
    const confirm = this.confirmPassword().trim();
    const userId = this.authService.getSessionUserId();

    if (!userId) {
      void this.alertService.validation('Sign in with your User ID to change your password.');
      return;
    }
    if (!next || next.length < 6) {
      void this.alertService.validation('Password must be at least 6 characters.');
      return;
    }
    if (next !== confirm) {
      void this.alertService.validation('New password and confirmation do not match.');
      return;
    }

    const ok = this.applicationFormService.updateLoginPassword(userId, next);
    if (!ok) {
      void this.alertService.validation('Could not update password for this user.');
      return;
    }

    this.newPassword.set('');
    this.confirmPassword.set('');
    await this.alertService.successAndWait('Password updated', 'Your password has been changed successfully.');
  }
}
