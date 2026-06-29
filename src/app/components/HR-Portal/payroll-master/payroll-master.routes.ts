import { Routes } from '@angular/router';
import { PayrollMasterShellComponent } from './payroll-master-shell';
import { PayrollProcessingComponent } from './payroll-processing/payroll-processing';
import { AddPayrollProcessComponent } from './payroll-processing/add-payroll-process/add-payroll-process';
import { AttendanceManagmentComponent } from './attendance-managment/attendance-managment';
import { TaxManagmentComponent } from './tax-managment/tax-managment';
import { TaxComputationComponent } from './tax-computation/tax-computation';
// import { AddPayrollSetupComponent } from './payroll-setup/add-payroll-setup/add-payroll-setup';

export const payrollMasterRoutes: Routes = [
  {
    path: 'payroll-master',
    component: PayrollMasterShellComponent,
    children: [
      { path: '', component: PayrollProcessingComponent },
      { path: 'payroll-processing/create', component: AddPayrollProcessComponent },
      { path: 'payroll-processing/edit/:id', component: AddPayrollProcessComponent },
      { path: 'payroll-processing/view/:id', component: AddPayrollProcessComponent },
      { path: 'attendance-managment', component: AttendanceManagmentComponent },
      { path: 'tax-managment', component: TaxManagmentComponent },
      { path: 'tax-computation', component: TaxComputationComponent },
      // { path: 'payroll-setup', component: AddPayrollSetupComponent },
      // { path: 'payroll-setup/create', redirectTo: 'payroll-setup', pathMatch: 'full' },
    ],
  },
];
