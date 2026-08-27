import { Routes } from '@angular/router';
import { requireAccess, requirePermission } from '../../../guards/permission.guard';
// import { AddPayrollSetupComponent } from './payroll-setup/add-payroll-setup/add-payroll-setup';

export const payrollMasterRoutes: Routes = [
  {
    path: 'payroll-master',
    loadComponent: () => import('./payroll-master-shell').then((m) => m.PayrollMasterShellComponent),
    canActivate: [
      requireAccess(
        {
          anyOf: [
            { moduleSlug: 'payroll_processing_form', action: 'list' },
            { moduleSlug: 'attendance_managment_form', action: 'list' },
            { moduleSlug: 'tax_allowance_form', action: 'list' },
            { moduleSlug: 'tax_computation_form', action: 'list' },
          ],
        },
        'payroll_processing_form',
        'list',
      ),
    ],
    children: [
      { path: '', loadComponent: () => import('./payroll-processing/payroll-processing').then((m) => m.PayrollProcessingComponent), canActivate: [requirePermission('payroll_processing_form', 'list')] },
      { path: 'payroll-processing/create', loadComponent: () => import('./payroll-processing/add-payroll-process/add-payroll-process').then((m) => m.AddPayrollProcessComponent), canActivate: [requirePermission('payroll_processing_form', 'add')] },
      { path: 'attendance-managment', loadComponent: () => import('./attendance-managment/attendance-managment').then((m) => m.AttendanceManagmentComponent), canActivate: [requirePermission('attendance_managment_form', 'list')] },
      { path: 'tax-managment', loadComponent: () => import('./tax-managment/tax-managment').then((m) => m.TaxManagmentComponent), canActivate: [requirePermission('tax_allowance_form', 'list')] },
      { path: 'tax-computation', loadComponent: () => import('./tax-computation/tax-computation').then((m) => m.TaxComputationComponent), canActivate: [requirePermission('tax_computation_form', 'list')] },
      // { path: 'payroll-setup', component: AddPayrollSetupComponent },
      // { path: 'payroll-setup/create', redirectTo: 'payroll-setup', pathMatch: 'full' },
    ],
  },
];
