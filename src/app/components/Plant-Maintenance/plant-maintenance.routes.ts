import { Routes } from '@angular/router';
import { PlantMaintenanceMainFormComponent } from './main-form/plant-maintenance-main-form';
import { PlantMaintenanceSetupShellComponent } from './setup-form/plant-maintenance-setup-shell';
import { SubComponentDefinitionListComponent } from './setup-form/sub-component-definition/sub-component-definition-list';
import { AddSubComponentDefinitionComponent } from './setup-form/sub-component-definition/add-sub-component-definition';
import { MaintenanceActivityDefinitionComponent } from './setup-form/maintenance-activity-definition/maintenance-activity-definition';

export const plantMaintenanceRoutes: Routes = [
  {
    path: 'plant-maintenance/main-form',
    component: PlantMaintenanceMainFormComponent,
  },
  {
    path: 'plant-maintenance/setup-form',
    component: PlantMaintenanceSetupShellComponent,
    children: [
      { path: '', redirectTo: 'sub-component-definition', pathMatch: 'full' },
      { path: 'sub-component-definition', component: SubComponentDefinitionListComponent },
      {
        path: 'sub-component-definition/create',
        component: AddSubComponentDefinitionComponent,
      },
      {
        path: 'sub-component-definition/edit/:id',
        component: AddSubComponentDefinitionComponent,
      },
      { path: 'maintenance-activity-definition', component: MaintenanceActivityDefinitionComponent },
    ],
  },
];