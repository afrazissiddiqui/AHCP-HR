import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { HR_FORM_TABS } from './forms-hub.registry';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-forms-hub',
  standalone: true,
  templateUrl: './forms-hub.html',
  styleUrl: './forms-hub.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class FormsHubComponent {
  protected readonly forms;

  constructor(
    private router: Router,
    private readonly permissionService: PermissionService,
  ) {
    this.forms = HR_FORM_TABS.filter((form) => this.permissionService.canAccess(form.access));
  }

  get totalForms(): number {
    return this.forms.length;
  }

  get totalCategories(): number {
    return new Set(this.forms.map(form => form.category)).size;
  }

  openForm(route: string): void {
    void this.router.navigateByUrl(route);
  }
}
