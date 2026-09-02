import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionService } from '../../services/permission.service';
import { getGatePassDefaultRoute } from './gate-pass-access.util';

@Component({
  selector: 'app-gate-pass-redirect',
  standalone: true,
  template: '',
})
export class GatePassRedirectComponent implements OnInit {
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.permissionService.ensureLoaded().subscribe(() => {
      const nextRoute = getGatePassDefaultRoute((moduleSlug, action) => this.permissionService.can(moduleSlug, action));
      void this.router.navigateByUrl(nextRoute);
    });
  }
}
