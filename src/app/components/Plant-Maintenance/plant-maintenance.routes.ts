import { Routes } from '@angular/router';
import { PlantMaintenanceMainFormComponent } from './main-form/plant-maintenance-main-form';
import { PlantMaintenanceSetupFormComponent } from './setup-form/plant-maintenance-setup-form';

export const plantMaintenanceRoutes: Routes = [
  {
    path: 'plant-maintenance/main-form',
    component: PlantMaintenanceMainFormComponent,
  },
  {
    path: 'plant-maintenance/setup-form',
    component: PlantMaintenanceSetupFormComponent,
  },
];
