import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface LoanAdvancePayload {
  headerInfo: {
    documentNo: string;
    employeeNature: string;
    department: string;
    requestType: string;
    employeeID: string;
    employmentType: string;
    designation: string;
    requestDate: string;
    employeeName: string;
    workGradeLevel: string;
    jobTitle: string;
    status: string;
    employeeCategory: string;
    reportingManager: string;
    location: string;
    joiningDate: string;
    yearsOfService: string;
    payrollMonth: string;
  };
  loanDetail: {
    existingLoan: string;
    loanAcquiredDate?: string;
    installmentNumber?: string;
    loanEndingDate?: string;
    previousInstallmentAmount?: string;
    previousLoanPurpose?: string;
    loanAmount?: string;
    loanAmountDeductedTillNow?: string;
    loanBalance?: string;
    newLoanRequest: {
      purpose: string;
      loanAmountRequested: string;
      installmentAmount: string;
      noOfInstallments: string;
      loanEndMonth: string;
      loanStartMonth: string;
      loanTenure: string;
      eligibleAmount: string;
    };
    remarks: string;
  };
  advanceDetail: {
    existingAdvance: string;
    advanceAcquiredDate?: string;
    advanceEligibleAmount: string;
    previousAdvancePurpose?: string;
    advanceRemarks?: string;
    advanceAmount?: string;
    advanceAmountToBeDeductedThisMonth?: string;
    advanceBalance?: string;
    newAdvanceRequest: {
      purpose: string;
      advanceAmountEligible: string;
      advanceAmountRequested: string;
    };
  };
  repaymentSchedule: {
    repaymentStartDate: string;
    repaymentFrequency: string;
    deductionAmount: string;
    remarks: string;
  };
}

export interface LoanAdvanceResponse {
  status: boolean;
  message: string;
  data?: Record<string, any>;
}

@Injectable({
  providedIn: 'root',
})
export class LoanAdvanceService {
  private readonly http = inject(HttpClient);

  submitLoanAdvance(payload: LoanAdvancePayload): Observable<LoanAdvanceResponse> {
    return this.http.post<LoanAdvanceResponse>(apiUrl('loan-advance-add'), payload);
  }
}
