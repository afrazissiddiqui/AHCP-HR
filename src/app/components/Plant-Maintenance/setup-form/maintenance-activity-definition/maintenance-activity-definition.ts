import { Component, inject } from '@angular/core';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { PlantMaintenanceSetupLayoutService } from '../plant-maintenance-setup-layout.service';

@Component({
  selector: 'app-maintenance-activity-definition',
  standalone: true,
  imports: [PageToolbarComponent],
  templateUrl: './maintenance-activity-definition.html',
  styleUrls: ['../../plant-maintenance-page.css'],
})
export class MaintenanceActivityDefinitionComponent {
  private readonly layout = inject(PlantMaintenanceSetupLayoutService);

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }
}
