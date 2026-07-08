import { Routes } from '@angular/router';
import { dashboardComponent } from './components/dashboard/dashboard';
import { RecruitmentComponent } from './components/HR-Portal/Application-Form/recruitment';
import { CreateJobRequisitionComponent } from './components/HR-Portal/Application-Form/create-job-requisition/create-job-requisition';
import { JobSpecificationFormComponent } from './components/HR-Portal/job-specification-form/job-specification-form';
import { CreateJobSpecificationComponent } from './components/HR-Portal/job-specification-form/create-job-specification/create-job-specification';
import { gatePassRoutes } from './components/gate-pass/gate-pass.routes';
import { EmployeeActionComponent } from './components/HR-Portal/employee-action/employee-action';
import { ProbationEvaluationFormComponent } from './components/HR-Portal/employee-action/probation-evaluation-form/probation-evaluation-form';
import { AddProbationEvaluationComponent } from './components/HR-Portal/employee-action/probation-evaluation-form/add-probation-evaluation/add-probation-evaluation';
import { TrainingDevelopmentFormComponent } from './components/HR-Portal/employee-action/training-development-form/training-development-form';
import { AddTrainingDevelopmentComponent } from './components/HR-Portal/employee-action/training-development-form/add-training-development/add-training-development';
import { PerformanceAppraisalFormComponent } from './components/HR-Portal/employee-action/performance-appraisal-form/performance-appraisal-form';
import { AddPerformanceAppraisalComponent } from './components/HR-Portal/employee-action/performance-appraisal-form/add-performance-appraisal/add-performance-appraisal';
import { ExpenseReimbursmentFormComponent } from './components/HR-Portal/employee-action/expense-reimbursment-form/expense-reimbursment-form';
import { AddExpenseReimbursmentComponent } from './components/HR-Portal/employee-action/expense-reimbursment-form/add-expense-reimbursment/add-expense-reimbursment';
import { LoanAdvanceFormComponent } from './components/HR-Portal/employee-action/loan-advance-form/loan-advance-form';
import { AddLoanAdvanceComponent } from './components/HR-Portal/employee-action/loan-advance-form/add-loan-advance/add-loan-advance';
import { LeaveApplicationFormComponent } from './components/HR-Portal/employee-action/leave-application-form/leave-application-form';
import { AddLeaveApplicationComponent } from './components/HR-Portal/employee-action/leave-application-form/add-leave-application/add-leave-application';
import { ApprovalAuthoritySetupComponent } from './components/HR-Portal/employee-action/approval-authority-setup/approval-authority-setup';
import { payrollMasterRoutes } from './components/HR-Portal/payroll-master/payroll-master.routes';
import { FormsHubComponent } from './components/forms-hub/forms-hub';
import { loginRoutes } from './components/login/login.routes';
import { ProfilePageComponent } from './components/profile/profile-page';
import { TerminationFormComponent } from './components/HR-Portal/termination/termination-form';
import { AddTerminationComponent } from './components/HR-Portal/termination/add-termination/add-termination';
import { plantMaintenanceRoutes } from './components/Plant-Maintenance/plant-maintenance.routes';
import { authGuard } from './guards/auth.guard';
import { requireAccess, requirePermission } from './guards/permission.guard';
import { miscellaneousRoutes } from './components/miscellaneous/miscellaneous.routes';
import { GlAccountDeterminationComponent } from './components/setup/gl-account-determination/gl-account-determination';
import { LeaveTypesComponent } from './components/setup/leave-types/leave-types';
import { UserSetupComponent } from './components/setup/user-setup/user-setup';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: dashboardComponent,
    canActivate: [authGuard],
  },
  ...loginRoutes,
  {
    path: 'profile',
    component: ProfilePageComponent,
    canActivate: [authGuard],
  },
  {
    path: 'forms-hub',
    component: FormsHubComponent,
    canActivate: [authGuard],
  },
  {
    path: 'recruitment',
    component: RecruitmentComponent,
    canActivate: [authGuard, requirePermission('application_form', 'list')],
  },
  {
    path: 'recruitment/create',
    component: CreateJobRequisitionComponent,
    canActivate: [authGuard, requirePermission('application_form', 'add')],
  },
  {
    path: 'recruitment/edit/:id',
    component: CreateJobRequisitionComponent,
    canActivate: [authGuard, requirePermission('application_form', 'update')],
  },
  {
    path: 'job-specification-form',
    component: JobSpecificationFormComponent,
    canActivate: [authGuard, requirePermission('job_specification', 'list')],
  },
  {
    path: 'job-specification-form/create',
    component: CreateJobSpecificationComponent,
    canActivate: [authGuard, requirePermission('job_specification', 'add')],
  },
  {
    path: 'job-specification-form/edit/:id',
    component: CreateJobSpecificationComponent,
    canActivate: [authGuard, requirePermission('job_specification', 'update')],
  },
  ...gatePassRoutes.map((route) =>
    route.redirectTo ? route : { ...route, canActivate: [authGuard] }
  ),
  {
    path: 'employee-action',
    component: EmployeeActionComponent,
    canActivate: [
      authGuard,
      requireAccess(
        {
          anyOf: [
            { moduleSlug: 'probation_evaluation_form', action: 'list' },
            { moduleSlug: 'training_development_form', action: 'list' },
            { moduleSlug: 'performance_appraisal_form', action: 'list' },
            { moduleSlug: 'expense_reimbursment_form', action: 'list' },
            { moduleSlug: 'loan_advance_form', action: 'list' },
            { moduleSlug: 'leave_application_form', action: 'list' },
          ],
        },
        'probation_evaluation_form',
        'list',
      ),
    ],
  },
  ...payrollMasterRoutes.map((route) =>
    route.redirectTo ? route : { ...route, canActivate: [authGuard] }
  ),
  {
    path: 'employee-action/probation-evaluation-form',
    component: ProbationEvaluationFormComponent,
    canActivate: [authGuard, requirePermission('probation_evaluation_form', 'list')],
  },
  {
    path: 'employee-action/probation-evaluation-form/create',
    component: AddProbationEvaluationComponent,
    canActivate: [authGuard, requirePermission('probation_evaluation_form', 'add')],
  },
  {
    path: 'employee-action/probation-evaluation-form/edit/:id',
    component: AddProbationEvaluationComponent,
    canActivate: [authGuard, requirePermission('probation_evaluation_form', 'update')],
  },
  {
    path: 'employee-action/training-development-form',
    component: TrainingDevelopmentFormComponent,
    canActivate: [authGuard, requirePermission('training_development_form', 'list')],
  },
  {
    path: 'employee-action/training-development-form/create',
    component: AddTrainingDevelopmentComponent,
    canActivate: [authGuard, requirePermission('training_development_form', 'add')],
  },
  {
    path: 'employee-action/training-development-form/edit/:id',
    component: AddTrainingDevelopmentComponent,
    canActivate: [authGuard, requirePermission('training_development_form', 'update')],
  },
  {
    path: 'employee-action/performance-appraisal-form',
    component: PerformanceAppraisalFormComponent,
    canActivate: [authGuard, requirePermission('performance_appraisal_form', 'list')],
  },
  {
    path: 'employee-action/performance-appraisal-form/create',
    component: AddPerformanceAppraisalComponent,
    canActivate: [authGuard, requirePermission('performance_appraisal_form', 'add')],
  },
  {
    path: 'employee-action/performance-appraisal-form/edit/:id',
    component: AddPerformanceAppraisalComponent,
    canActivate: [authGuard, requirePermission('performance_appraisal_form', 'update')],
  },
  {
    path: 'employee-action/expense-reimbursement-form',
    component: ExpenseReimbursmentFormComponent,
    canActivate: [authGuard, requirePermission('expense_reimbursment_form', 'list')],
  },
  {
    path: 'employee-action/expense-reimbursement-form/create',
    component: AddExpenseReimbursmentComponent,
    canActivate: [authGuard, requirePermission('expense_reimbursment_form', 'add')],
  },
  {
    path: 'employee-action/expense-reimbursement-form/edit/:id',
    component: AddExpenseReimbursmentComponent,
    canActivate: [authGuard, requirePermission('expense_reimbursment_form', 'update')],
  },
  {
    path: 'employee-action/loan-advance-form',
    component: LoanAdvanceFormComponent,
    canActivate: [authGuard, requirePermission('loan_advance_form', 'list')],
  },
  {
    path: 'employee-action/leave-application-form',
    component: LeaveApplicationFormComponent,
    canActivate: [authGuard, requirePermission('leave_application_form', 'list')],
  },
  {
    path: 'employee-action/loan-advance-form/create',
    component: AddLoanAdvanceComponent,
    canActivate: [authGuard, requirePermission('loan_advance_form', 'add')],
  },
  {
    path: 'employee-action/loan-advance-form/edit/:id',
    component: AddLoanAdvanceComponent,
    canActivate: [authGuard, requirePermission('loan_advance_form', 'update')],
  },
  {
    path: 'employee-action/leave-application-form/create',
    component: AddLeaveApplicationComponent,
    canActivate: [authGuard, requirePermission('leave_application_form', 'add')],
  },
  {
    path: 'employee-action/leave-application-form/edit/:id',
    component: AddLeaveApplicationComponent,
    canActivate: [authGuard, requirePermission('leave_application_form', 'update')],
  },
  {
    path: 'employee-action/approval-authority-setup',
    component: ApprovalAuthoritySetupComponent,
    canActivate: [authGuard],
  },
  {
    path: 'setup/gl-account-determination',
    component: GlAccountDeterminationComponent,
    canActivate: [authGuard, requirePermission('gl_account_determination_form', 'list')],
  },
  {
    path: 'setup/leave-types',
    component: LeaveTypesComponent,
    canActivate: [authGuard, requirePermission('leave_types_form', 'list')],
  },
  {
    path: 'setup/user-setup',
    component: UserSetupComponent,
    canActivate: [authGuard, requirePermission('user_setup_form', 'list')],
  },
  {
    path: 'termination',
    component: TerminationFormComponent,
    canActivate: [authGuard, requirePermission('termination_form', 'list')],
  },
  {
    path: 'termination/create',
    component: AddTerminationComponent,
    canActivate: [authGuard, requirePermission('termination_form', 'add')],
  },
  {
    path: 'termination/edit/:id',
    component: AddTerminationComponent,
    canActivate: [authGuard, requirePermission('termination_form', 'update')],
  },
  ...plantMaintenanceRoutes.map((route) =>
    route.redirectTo ? route : { ...route, canActivate: [authGuard] }
  ),
  ...miscellaneousRoutes.map((route) =>
    route.redirectTo ? route : { ...route, canActivate: [authGuard] }
  ),
];
