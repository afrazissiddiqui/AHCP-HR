import { Routes } from '@angular/router';
import { PlantMaintenanceMainFormComponent } from './main-form/plant-maintenance-main-form';
import { PlantMaintenanceSetupShellComponent } from './setup-form/plant-maintenance-setup-shell';
import { SubComponentDefinitionComponent } from './setup-form/sub-component-definition/sub-component-definition';
import { AddSubComponentDefinitionComponent } from './setup-form/sub-component-definition/add-sub-component-definition/add-sub-component-definition';
import { MaintenanceActivityDefinitionComponent } from './setup-form/maintenance-activity-definition/maintenance-activity-definition';
import { AddMaintenanceActivityDefinitionComponent } from './setup-form/maintenance-activity-definition/add-maintenance-activity-definition/add-maintenance-activity-definition';
import { PlantMaintenanceMasterFormComponent } from './setup-form/plant-maintenance-master-form/plant-maintenance-master-form';
import { AddPlantMaintenanceMasterFormComponent } from './setup-form/plant-maintenance-master-form/add-plant-maintenance-master-form/add-plant-maintenance-master-form';
import { HuskyFormComponent } from './main-form/husky-form/husky-form';
import { AddHuskyFormComponent } from './main-form/husky-form/add-husky-form/add-husky-form';
import { ItrFormComponent } from './main-form/itr-form/itr-form';
import { AddItrFormComponent } from './main-form/itr-form/add-itr-form/add-itr-form';

export const plantMaintenanceRoutes: Routes = [
  {
    path: 'plant-maintenance/main-form',
    component: PlantMaintenanceMainFormComponent,
    children: [
      { path: '', redirectTo: 'plant-maintenance-master-form', pathMatch: 'full' },
      {
        path: 'plant-maintenance-master-form',
        component: PlantMaintenanceMasterFormComponent,
      },
      {
        path: 'plant-maintenance-master-form/create',
        component: AddPlantMaintenanceMasterFormComponent,
      },
      {
        path: 'plant-maintenance-master-form/edit/:id',
        component: AddPlantMaintenanceMasterFormComponent,
      },
      {
        path: 'husky-form',
        component: HuskyFormComponent,
      },
      {
        path: 'husky-form/create',
        component: AddHuskyFormComponent,
      },
      {
        path: 'husky-form/edit/:id',
        component: AddHuskyFormComponent,
      },
      {
        path: 'itr-form',
        component: ItrFormComponent,
      },
      {
        path: 'itr-form/create',
        component: AddItrFormComponent,
      },
      {
        path: 'itr-form/edit/:id',
        component: AddItrFormComponent,
      },
    ],
  },
  {
    path: 'plant-maintenance/setup-form',
    component: PlantMaintenanceSetupShellComponent,
    children: [
      { path: '', redirectTo: 'sub-component-definition', pathMatch: 'full' },
      { path: 'sub-component-definition', component: SubComponentDefinitionComponent },
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
        component: MaintenanceActivityDefinitionComponent,
      },
      {
        path: 'maintenance-activity-definition/create',
        component: AddMaintenanceActivityDefinitionComponent,
      },
      {
        path: 'maintenance-activity-definition/edit/:id',
        component: AddMaintenanceActivityDefinitionComponent,
      },
    ],
  },
];