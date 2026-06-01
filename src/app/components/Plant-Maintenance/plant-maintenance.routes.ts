import { Routes } from '@angular/router';
import { PlantMaintenanceMainFormComponent } from './main-form/plant-maintenance-main-form';
import { PlantMaintenanceSetupShellComponent } from './setup-form/plant-maintenance-setup-shell';
import { SubComponentDefinitionListComponent } from './setup-form/sub-component-definition/sub-component-definition-list';
import { AddSubComponentDefinitionComponent } from './setup-form/sub-component-definition/add-sub-component-definition';
import { MaintenanceActivityDefinitionListComponent } from './setup-form/maintenance-activity-definition/maintenance-activity-definition-list';
import { AddMaintenanceActivityDefinitionComponent } from './setup-form/maintenance-activity-definition/add-maintenance-activity-definition';
import { PlantMaintenanceMasterFormListComponent } from './setup-form/plant-maintenance-master-form/plant-maintenance-master-form-list';
import { AddPlantMaintenanceMasterFormComponent } from './setup-form/plant-maintenance-master-form/add-plant-maintenance-master-form';

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
      {
        path: 'maintenance-activity-definition',
        component: MaintenanceActivityDefinitionListComponent,
      },
      {
        path: 'maintenance-activity-definition/create',
        component: AddMaintenanceActivityDefinitionComponent,
      },
      {
        path: 'maintenance-activity-definition/edit/:id',
        component: AddMaintenanceActivityDefinitionComponent,
      },
      {
        path: 'plant-maintenance-master-form',
        component: PlantMaintenanceMasterFormListComponent,
      },
      {
        path: 'plant-maintenance-master-form/create',
        component: AddPlantMaintenanceMasterFormComponent,
      },
      {
        path: 'plant-maintenance-master-form/edit/:id',
        component: AddPlantMaintenanceMasterFormComponent,
      },
    ],
  },
];