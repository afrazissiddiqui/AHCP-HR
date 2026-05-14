import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  userId = '';
  password = '';
  rememberMe = false;

  constructor(
    private readonly router: Router,
    private readonly alertService: AlertService,
    private readonly authService: AuthService,
  ) {}

  submit(): void {
    const uid = this.userId.trim();
    if (!uid || !this.password) {
      void this.alertService.validation('Please enter User ID and Password.');
      return;
    }
    this.authService.login();
    void this.alertService.success('Welcome', `Signed in as ${uid}.`);
    void this.router.navigateByUrl('/dashboard');
  }

  goDashboard(): void {
    void this.router.navigateByUrl('/dashboard');
  }
}
