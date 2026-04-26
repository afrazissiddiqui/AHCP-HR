import { Routes } from '@angular/router';
import { SampleInspectionRequest } from './components/sample-inspection-request/sample-inspection-request';
import { dashboardComponent } from './components/dashboard/dashboard';
import { RecruitmentComponent } from './components/recruitment/recruitment';
import { CreateJobRequisitionComponent } from './components/create-job-requisition/create-job-requisition';
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
    path: 'sample-inspection-request-sir',
    component: SampleInspectionRequest
  },
  {
    path: 'recruitment',
    component: RecruitmentComponent
  },
  {
    path: 'recruitment/create',
    component: CreateJobRequisitionComponent
  }
];
