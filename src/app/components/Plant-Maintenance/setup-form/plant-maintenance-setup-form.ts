import { Component } from '@angular/core';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';

@Component({
  selector: 'app-plant-maintenance-setup-form',
  standalone: true,
  imports: [PageToolbarComponent],
  templateUrl: './plant-maintenance-setup-form.html',
  styleUrls: ['../plant-maintenance-page.css'],
})
export class PlantMaintenanceSetupFormComponent {}
