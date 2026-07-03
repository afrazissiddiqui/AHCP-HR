import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { formatApiErrorMessage } from '../../utils/api-error.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  userId = '';
  password = '';
  rememberMe = false;
  isSubmitting = false;

  constructor(
    private readonly router: Router,
    private readonly alertService: AlertService,
    private readonly authService: AuthService,
    private readonly permissionService: PermissionService,
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      void this.router.navigateByUrl('/dashboard');
    }
  }

  submit(): void {
    const email = this.userId.trim();
    if (!email || !this.password) {
      void this.alertService.validation('Please enter email and password.');
      return;
    }
    this.isSubmitting = true;
    this.authService.loginWithApi(email, this.password).subscribe({
      next: (response) => {
        this.permissionService.reloadForCurrentUser().subscribe({
          next: () => {
            this.isSubmitting = false;
            void this.alertService.success('Welcome', response.message || `Signed in as ${email}.`);
            void this.router.navigateByUrl('/dashboard');
          },
          error: () => {
            this.isSubmitting = false;
            void this.alertService.success('Welcome', response.message || `Signed in as ${email}.`);
            void this.router.navigateByUrl('/dashboard');
          },
        });
      },
      error: (error: unknown) => {
        this.isSubmitting = false;
        void this.alertService.error(
          'Login failed',
          formatApiErrorMessage(error, 'Login failed. Please check your credentials.'),
        );
      },
    });
  }
}
