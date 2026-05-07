import { Routes } from '@angular/router';
import { dashboardComponent } from './components/dashboard/dashboard';
import { RecruitmentComponent } from './components/HR-Portal/Application-Form/recruitment';
import { CreateJobRequisitionComponent } from './components/HR-Portal/Application-Form/create-job-requisition/create-job-requisition';
import { LeaveManagmentComponent } from './components/HR-Portal/leave-managment/leave-managment';
import { JobSpecificationFormComponent } from './components/HR-Portal/job-specification-form/job-specification-form';
import { CreateJobSpecificationComponent } from './components/HR-Portal/job-specification-form/create-job-specification/create-job-specification';
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

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: dashboardComponent
  },
  {
    path: 'recruitment',
    component: RecruitmentComponent
  },
  {
    path: 'recruitment/create',
    component: CreateJobRequisitionComponent
  },
  {
    path: 'job-specification-form',
    component: JobSpecificationFormComponent
  },
  {
    path: 'job-specification-form/create',
    component: CreateJobSpecificationComponent
  },
  {
    path: 'leave-managment/create',
    component: LeaveManagmentComponent
  },
  {
    path: 'employee-action',
    component: EmployeeActionComponent
  },
  {
    path: 'employee-action/probation-evaluation-form',
    component: ProbationEvaluationFormComponent
  },
  {
    path: 'employee-action/probation-evaluation-form/create',
    component: AddProbationEvaluationComponent
  },
  {
    path: 'employee-action/training-development-form',
    component: TrainingDevelopmentFormComponent
  },
  {
    path: 'employee-action/training-development-form/create',
    component: AddTrainingDevelopmentComponent
  },
  {
    path: 'employee-action/performance-appraisal-form',
    component: PerformanceAppraisalFormComponent
  },
  {
    path: 'employee-action/performance-appraisal-form/create',
    component: AddPerformanceAppraisalComponent
  },
  {
    path: 'employee-action/expense-reimbursement-form',
    component: ExpenseReimbursmentFormComponent
  },
  {
    path: 'employee-action/expense-reimbursement-form/create',
    component: AddExpenseReimbursmentComponent
  },
  {
    path: 'employee-action/loan-advance-form',
    component: LoanAdvanceFormComponent
  },
  {
    path: 'employee-action/leave-application-form',
    component: LeaveApplicationFormComponent
  },
  {
    path: 'employee-action/loan-advance-form/create',
    component: AddLoanAdvanceComponent
  },
  {
    path: 'employee-action/leave-application-form/create',
    component: AddLeaveApplicationComponent
  },
  
    
];
