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
import { requireAccess, requirePermission } from '../../guards/permission.guard';

export const plantMaintenanceRoutes: Routes = [
  {
    path: 'plant-maintenance/main-form',
    component: PlantMaintenanceMainFormComponent,
    canActivate: [
      requireAccess(
        {
          anyOf: [
            { moduleSlug: 'plant_maintenance_master_form', action: 'list' },
            { moduleSlug: 'husky_form', action: 'list' },
            { moduleSlug: 'itr_form', action: 'list' },
          ],
        },
        'plant_maintenance_master_form',
        'list',
      ),
    ],
    children: [
      { path: '', redirectTo: 'plant-maintenance-master-form', pathMatch: 'full' },
      {
        path: 'plant-maintenance-master-form',
        component: PlantMaintenanceMasterFormComponent,
        canActivate: [requirePermission('plant_maintenance_master_form', 'list')],
      },
      {
        path: 'plant-maintenance-master-form/create',
        component: AddPlantMaintenanceMasterFormComponent,
        canActivate: [requirePermission('plant_maintenance_master_form', 'add')],
      },
      {
        path: 'plant-maintenance-master-form/edit/:id',
        component: AddPlantMaintenanceMasterFormComponent,
        canActivate: [requirePermission('plant_maintenance_master_form', 'update')],
      },
      {
        path: 'husky-form',
        component: HuskyFormComponent,
        canActivate: [requirePermission('husky_form', 'list')],
      },
      {
        path: 'husky-form/create',
        component: AddHuskyFormComponent,
        canActivate: [requirePermission('husky_form', 'add')],
      },
      {
        path: 'husky-form/edit/:id',
        component: AddHuskyFormComponent,
        canActivate: [requirePermission('husky_form', 'update')],
      },
      {
        path: 'itr-form',
        component: ItrFormComponent,
        canActivate: [requirePermission('itr_form', 'list')],
      },
      {
        path: 'itr-form/create',
        component: AddItrFormComponent,
        canActivate: [requirePermission('itr_form', 'add')],
      },
      {
        path: 'itr-form/edit/:id',
        component: AddItrFormComponent,
        canActivate: [requirePermission('itr_form', 'update')],
      },
    ],
  },
  {
    path: 'plant-maintenance/setup-form',
    component: PlantMaintenanceSetupShellComponent,
    canActivate: [
      requireAccess(
        {
          anyOf: [
            { moduleSlug: 'sub_component_defination_form', action: 'list' },
            { moduleSlug: 'maintenance_activity_defination_form', action: 'list' },
          ],
        },
        'sub_component_defination_form',
        'list',
      ),
    ],
    children: [
      { path: '', redirectTo: 'sub-component-definition', pathMatch: 'full' },
      { path: 'sub-component-definition', component: SubComponentDefinitionComponent, canActivate: [requirePermission('sub_component_defination_form', 'list')] },
      {
        path: 'sub-component-definition/create',
        component: AddSubComponentDefinitionComponent,
        canActivate: [requirePermission('sub_component_defination_form', 'add')],
      },
      {
        path: 'sub-component-definition/edit/:id',
        component: AddSubComponentDefinitionComponent,
        canActivate: [requirePermission('sub_component_defination_form', 'update')],
      },
      {
        path: 'maintenance-activity-definition',
        component: MaintenanceActivityDefinitionComponent,
        canActivate: [requirePermission('maintenance_activity_defination_form', 'list')],
      },
      {
        path: 'maintenance-activity-definition/create',
        component: AddMaintenanceActivityDefinitionComponent,
        canActivate: [requirePermission('maintenance_activity_defination_form', 'add')],
      },
      {
        path: 'maintenance-activity-definition/edit/:id',
        component: AddMaintenanceActivityDefinitionComponent,
        canActivate: [requirePermission('maintenance_activity_defination_form', 'update')],
      },
    ],
  },
];