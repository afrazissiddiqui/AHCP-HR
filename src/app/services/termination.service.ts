import { Injectable, signal } from '@angular/core';
import { ApplicationFormRecord, ApplicationFormService } from './application-form.service';

export interface TerminationDuesPayable {
  fromDate: string;
  toDate: string;
  noOfDaysSalaryNotPaid: string;
  salaryPayable: string;
  gratuity: string;
  overtimeAmount: string;
  noticePay: string;
  leaveEncashmentAmount: string;
  otherPayables: string;
}

export interface TerminationRecoverableAmount {
  salaryAdvances: string;
  outstandingLoanBalance: string;
  incomeTaxDeductions: string;
  noticePay: string;
  leaveWithoutPay: string;
  assetsHandledOver: string;
  assetRecovered: string;
  assetRecoveryName: string;
  otherRecoverableAmounts: string;
  sss: string;
}

export interface TerminationFormDetail {
  remarks?: string;
  duesPayable: TerminationDuesPayable;
  recoverableAmount: TerminationRecoverableAmount;
  totalDuesPayable: number;
  totalRecoverableAmount: number;
}

export interface TerminationRecord {
  EmployeeId: number;
  EmployeeName: string;
  Department: string;
  EmployeeCategory: string;
  Designation: string;
  BranchLocation: string;
  CostCenter: string;
  WorkGradeLevel: string;
  LastWorkingDay: string;
  YearOfService: number;
  ReleasingDate: string;
  GrossMonthlySalary: string;
  CommitteeMeetingHeld: string;
  selected?: boolean;
  detail?: TerminationFormDetail;
}

function mapApplicationToTermination(record: ApplicationFormRecord): TerminationRecord {
  const month = (record.EmployeeCode % 12) + 1;
  const lastWorkingDay = `2026-${month.toString().padStart(2, '0')}-28`;
  const branches = ['Karachi HQ', 'Lahore Office', 'Islamabad Branch', 'Faisalabad Site'];
  const costCenters = ['CC-1001 HR', 'CC-2005 IT', 'CC-3010 Finance', 'CC-4002 Operations'];
  const gradeLevels = ['L1', 'L2', 'L3', 'M1', 'M2', 'M3'];
  const yearsOfService = 1 + (record.EmployeeCode % 15) + (record.EmployeeCode % 10) / 10;

  const releasingMonth = ((record.EmployeeCode % 12) + 2) % 12 || 12;
  const releasingDate = `2026-${releasingMonth.toString().padStart(2, '0')}-01`;

  return {
    EmployeeId: record.EmployeeCode,
    EmployeeName: record.EmployeeName,
    Department: record.Department,
    EmployeeCategory: record.EmploymentCategory || '—',
    Designation: record.Designation,
    BranchLocation: branches[record.EmployeeCode % branches.length],
    CostCenter: costCenters[record.EmployeeCode % costCenters.length],
    WorkGradeLevel: gradeLevels[record.EmployeeCode % gradeLevels.length],
    LastWorkingDay: lastWorkingDay,
    YearOfService: yearsOfService,
    ReleasingDate: releasingDate,
    GrossMonthlySalary: String(85000 + (record.EmployeeCode % 20) * 2500),
    CommitteeMeetingHeld: record.EmployeeCode % 2 === 0 ? 'Yes' : 'No',
    selected: record.selected ?? false,
  };
}

@Injectable({
  providedIn: 'root',
})
export class TerminationService {
  private readonly records = signal<TerminationRecord[]>([]);

  constructor(applicationFormService: ApplicationFormService) {
    this.records.set(
      applicationFormService.getApplicationRecords().map(mapApplicationToTermination)
    );
  }

  getTerminationRecords(): TerminationRecord[] {
    return this.records();
  }

  getNextEmployeeId(): number {
    const list = this.records();
    if (list.length === 0) {
      return 1001;
    }
    return Math.max(...list.map((r) => r.EmployeeId)) + 1;
  }

  addTerminationRecord(record: TerminationRecord): void {
    this.records.update((list) => [...list, record]);
  }
}
