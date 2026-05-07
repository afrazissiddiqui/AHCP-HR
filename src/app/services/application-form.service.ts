import { Injectable, signal } from '@angular/core';

export interface ApplicationFormRecord {
  EmployeeCode: number;
  EmployeeName: string;
  Department: string;
  EmployeeNature: string;
  Designation: string;
  ReportingManager: string;
  EmploymentType: string;
  EmploymentCategory: string;
  status: string;
  selected?: boolean;
}

export interface EmployeeMasterDataRecord {
  EmployeeID: number;
  EmployeeName: string;
  Department: string;
  Designation: string;
  EmploymentType: string;
  EmployeeCategory: string;
  WorkLevel: string;
  EmploymentStatus: string;
  selected: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationFormService {
  private readonly applicationRecords = signal<ApplicationFormRecord[]>([
    { EmployeeCode: 1, EmployeeName: 'IGP-1001', Department: 'BP-001', EmployeeNature: 'Alpha Traders', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 2, EmployeeName: 'IGP-1002', Department: 'BP-002', EmployeeNature: 'Beta Industries', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 3, EmployeeName: 'IGP-1003', Department: 'BP-003', EmployeeNature: 'Gamma Corp', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 4, EmployeeName: 'IGP-1004', Department: 'BP-004', EmployeeNature: 'Delta Supplies', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 5, EmployeeName: 'IGP-1005', Department: 'BP-005', EmployeeNature: 'Omega Solutions', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 6, EmployeeName: 'IGP-1006', Department: 'BP-006', EmployeeNature: 'Zeta Tech', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 7, EmployeeName: 'IGP-1007', Department: 'BP-007', EmployeeNature: 'Eta Logistics', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 8, EmployeeName: 'IGP-1008', Department: 'BP-008', EmployeeNature: 'Theta Systems', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 9, EmployeeName: 'IGP-1009', Department: 'BP-009', EmployeeNature: 'Iota Services', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 10, EmployeeName: 'IGP-1010', Department: 'BP-010', EmployeeNature: 'Kappa Global', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 11, EmployeeName: 'IGP-1011', Department: 'BP-011', EmployeeNature: 'Lambda Works', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 12, EmployeeName: 'IGP-1012', Department: 'BP-012', EmployeeNature: 'Mu Group', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 13, EmployeeName: 'IGP-1013', Department: 'BP-013', EmployeeNature: 'Nu Dynamics', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 14, EmployeeName: 'IGP-1014', Department: 'BP-014', EmployeeNature: 'Xi Corp', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 15, EmployeeName: 'IGP-1015', Department: 'BP-015', EmployeeNature: 'Omicron Ltd', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 16, EmployeeName: 'IGP-1016', Department: 'BP-016', EmployeeNature: 'Pi Solutions', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 17, EmployeeName: 'IGP-1017', Department: 'BP-017', EmployeeNature: 'Rho Partners', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 18, EmployeeName: 'IGP-1018', Department: 'BP-018', EmployeeNature: 'Sigma Traders', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 19, EmployeeName: 'IGP-1019', Department: 'BP-019', EmployeeNature: 'Tau Industries', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false },
    { EmployeeCode: 20, EmployeeName: 'IGP-1020', Department: 'BP-020', EmployeeNature: 'Upsilon Corp', Designation: 'Active', ReportingManager: 'Print', EmploymentType: 'Print', EmploymentCategory: 'Print', status: 'Active', selected: false }
  ]);

  getApplicationRecords(): ApplicationFormRecord[] {
    return this.applicationRecords();
  }

  getEmployeeMasterDataRecords(): EmployeeMasterDataRecord[] {
    return this.applicationRecords().map((record) => ({
      EmployeeID: record.EmployeeCode,
      EmployeeName: record.EmployeeName,
      Department: record.Department,
      Designation: record.Designation,
      EmploymentType: record.EmploymentType,
      EmployeeCategory: record.EmploymentCategory,
      WorkLevel: record.EmployeeNature,
      EmploymentStatus: record.status,
      selected: record.selected ?? false
    }));
  }
}
