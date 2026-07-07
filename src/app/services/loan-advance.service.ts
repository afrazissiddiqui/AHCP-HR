import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface LoanAdvanceHeaderInfo {
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
}

export interface LoanAdvanceNewLoanRequest {
  purpose: string;
  loanAmountRequested: string;
  installmentAmount: string;
  noOfInstallments: string;
  loanEndMonth: string;
  loanStartMonth: string;
  loanTenure: string;
  eligibleAmount: string;
}

export interface LoanAdvanceLoanDetail {
  existingLoan: string;
  loanAcquiredDate?: string;
  installmentNumber?: string;
  loanEndingDate?: string;
  previousInstallmentAmount?: string;
  previousLoanPurpose?: string;
  loanAmount?: string;
  loanAmountDeductedTillNow?: string;
  loanBalance?: string;
  newLoanRequest: LoanAdvanceNewLoanRequest;
  remarks: string;
}

export interface LoanAdvanceNewAdvanceRequest {
  purpose: string;
  advanceAmountEligible: string;
  advanceAmountRequested: string;
}

export interface LoanAdvanceAdvanceDetail {
  existingAdvance: string;
  advanceAcquiredDate?: string;
  advanceEligibleAmount: string;
  previousAdvancePurpose?: string;
  advanceRemarks?: string;
  advanceAmount?: string;
  advanceAmountToBeDeductedThisMonth?: string;
  advanceBalance?: string;
  newAdvanceRequest: LoanAdvanceNewAdvanceRequest;
}

export interface LoanAdvanceRepaymentSchedule {
  repaymentStartDate: string;
  repaymentFrequency: string;
  deductionAmount: string;
  remarks: string;
}

export interface LoanAdvancePayload {
  headerInfo: LoanAdvanceHeaderInfo;
  loanDetail: LoanAdvanceLoanDetail;
  advanceDetail: LoanAdvanceAdvanceDetail;
  repaymentSchedule: LoanAdvanceRepaymentSchedule;
}

export interface LoanAdvanceRecord {
  Id: number;
  DocumentNo: string;
  EmployeeID: string;
  EmployeeName: string;
  Department: string;
  RequestType: string;
  RequestDate: string;
  Status: string;
  EmployeeNature: string;
  EmploymentType: string;
  Designation: string;
  WorkGradeLevel: string;
  JobTitle: string;
  EmployeeCategory: string;
  ReportingManager: string;
  Location: string;
  JoiningDate: string;
  YearsOfService: string;
  PayrollMonth: string;
  ExistingLoan: string;
  LoanAmountRequested: string;
  LoanInstallmentAmount: string;
  NoOfInstallments: string;
  LoanPurpose: string;
  LoanEligibleAmount: string;
  ExistingAdvance: string;
  AdvanceAmountRequested: string;
  AdvancePurpose: string;
  AdvanceEligibleAmount: string;
  RepaymentStartDate: string;
  RepaymentFrequency: string;
  DeductionAmount: string;
  HeaderInfo: LoanAdvanceHeaderInfo;
  LoanDetail: LoanAdvanceLoanDetail;
  AdvanceDetail: LoanAdvanceAdvanceDetail;
  RepaymentSchedule: LoanAdvanceRepaymentSchedule;
  selected?: boolean;
}

export interface LoanAdvanceResponse {
  status: boolean;
  message: string;
  data?: Record<string, unknown>;
}

const LOAN_ADVANCE_LIST_URL = apiUrl('loan-advance-list');
const LOAN_ADVANCE_ADD_URL = apiUrl('loan-advance-add');
const LOAN_ADVANCE_UPDATE_URL = apiUrl('loan-advance-update');
const LOAN_ADVANCE_DETAIL_URL = apiUrl('loan-advance-detail');
const LOAN_ADVANCE_DELETE_URL = apiUrl('loan-advance-delete');

@Injectable({
  providedIn: 'root',
})
export class LoanAdvanceService {
  private readonly http = inject(HttpClient);
  private readonly loanList = signal<LoanAdvanceRecord[]>([]);

  readonly loans = this.loanList.asReadonly();

  fetchLoanAdvances(): Observable<LoanAdvanceRecord[]> {
    return this.http.get<unknown>(LOAN_ADVANCE_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => this.loanList.set(records)),
    );
  }

  submitLoanAdvance(payload: LoanAdvancePayload): Observable<LoanAdvanceResponse> {
    return this.http.post<LoanAdvanceResponse>(LOAN_ADVANCE_ADD_URL, payload);
  }

  updateLoanAdvance(id: string | number, payload: LoanAdvancePayload): Observable<LoanAdvanceResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.put<LoanAdvanceResponse>(`${LOAN_ADVANCE_UPDATE_URL}/${identifier}`, payload);
  }

  fetchLoanAdvanceDetail(id: string | number): Observable<LoanAdvanceRecord> {
    const numericId = Number.parseInt(String(id), 10) || 0;
    const cached = this.findLoanById(id);
    if (cached) {
      return of(this.ensureRecordId(cached, numericId));
    }

    const identifier = encodeURIComponent(String(id));
    return this.http.get<unknown>(`${LOAN_ADVANCE_DETAIL_URL}/${identifier}`).pipe(
      map((response) => this.ensureRecordId(this.mapDetailResponse(response), numericId)),
      catchError(() => this.resolveLoanAdvanceFromList(numericId)),
    );
  }

  deleteLoanAdvance(id: string | number): Observable<LoanAdvanceResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete<LoanAdvanceResponse>(`${LOAN_ADVANCE_DELETE_URL}/${identifier}`);
  }

  removeLoanRecord(record: LoanAdvanceRecord): void {
    this.loanList.update((list) => list.filter((item) => item.Id !== record.Id));
  }

  findLoanById(id: string | number): LoanAdvanceRecord | undefined {
    const numericId = Number.parseInt(String(id), 10);
    return this.loanList().find((item) => item.Id === numericId);
  }

  private resolveLoanAdvanceFromList(numericId: number): Observable<LoanAdvanceRecord> {
    const fromCache = this.loanList().find((item) => item.Id === numericId);
    if (fromCache) {
      return of(fromCache);
    }

    return this.fetchLoanAdvances().pipe(
      switchMap((records) => {
        const found = records.find((item) => item.Id === numericId);
        if (found) {
          return of(found);
        }
        return throwError(() => new Error('Loan advance record not found'));
      }),
    );
  }

  private ensureRecordId(record: LoanAdvanceRecord, numericId: number): LoanAdvanceRecord {
    if (!record.Id && numericId) {
      return { ...record, Id: numericId };
    }
    return record;
  }

  private extractApiItems(response: unknown): Array<Record<string, unknown>> {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }

    if (typeof response !== 'object') {
      return [];
    }

    const obj = response as Record<string, unknown>;
    const arrayKeys = [
      'data',
      'items',
      'results',
      'records',
      'list',
      'loan_advances',
      'loan_advance_list',
      'loanAdvanceList',
      'loanAdvances',
    ];

    for (const key of arrayKeys) {
      const value = obj[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      }
    }

    const nestedData = obj['data'];
    if (nestedData && typeof nestedData === 'object') {
      const nestedItems = this.extractApiItems(nestedData);
      if (nestedItems.length > 0) {
        return nestedItems;
      }
    }

    if (
      obj['headerInfo'] ||
      obj['header_info'] ||
      obj['HeaderInfo'] ||
      obj['loanDetail'] ||
      obj['loan_detail'] ||
      obj['LoanDetail'] ||
      obj['documentNo'] ||
      obj['document_no'] ||
      obj['DocumentNo']
    ) {
      return [obj];
    }

    return [];
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value === undefined || value === null) {
      return {};
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return {};
      }
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return {};
      }
      return {};
    }
    if (Array.isArray(value)) {
      const first = value[0];
      return first && typeof first === 'object' ? (first as Record<string, unknown>) : {};
    }
    if (typeof value === 'object') {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private pickString(sources: Array<Record<string, unknown>>, keys: string[]): string {
    const asString = (value: unknown): string =>
      value === undefined || value === null ? '' : String(value).trim();

    for (const source of sources) {
      for (const key of keys) {
        const text = asString(source[key]);
        if (text) {
          return text;
        }
      }
    }
    return '';
  }

  private mapDetailResponse(response: unknown): LoanAdvanceRecord {
    const items = this.extractApiItems(response);
    if (items.length > 0) {
      return this.mapApiItemToRecord(items[0]);
    }

    if (response && typeof response === 'object') {
      return this.mapApiItemToRecord(response as Record<string, unknown>);
    }

    throw new Error('Loan advance record not found');
  }

  private mapApiItemToRecord(item: Record<string, unknown>): LoanAdvanceRecord {
    const headerSource = this.asRecord(
      item['headerInfo'] ?? item['header_info'] ?? item['HeaderInfo'],
    );
    const loanSource = this.asRecord(item['loanDetail'] ?? item['loan_detail'] ?? item['LoanDetail']);
    const advanceSource = this.asRecord(
      item['advanceDetail'] ?? item['advance_detail'] ?? item['AdvanceDetail'],
    );
    const repaymentSource = this.asRecord(
      item['repaymentSchedule'] ?? item['repayment_schedule'] ?? item['RepaymentSchedule'],
    );
    const newLoanSource = this.asRecord(
      loanSource['newLoanRequest'] ?? loanSource['new_loan_request'] ?? loanSource['NewLoanRequest'],
    );
    const newAdvanceSource = this.asRecord(
      advanceSource['newAdvanceRequest'] ??
        advanceSource['new_advance_request'] ??
        advanceSource['NewAdvanceRequest'],
    );

    const sources = [headerSource, loanSource, advanceSource, repaymentSource, newLoanSource, newAdvanceSource, item];
    const id = this.pickString([item], ['id', 'Id', 'loan_advance_id']);

    const headerInfo: LoanAdvanceHeaderInfo = {
      documentNo: this.pickString(sources, ['documentNo', 'document_no', 'DocumentNo']),
      employeeNature: this.pickString(sources, ['employeeNature', 'employee_nature', 'EmployeeNature']),
      department: this.pickString(sources, ['department', 'Department']),
      requestType: this.pickString(sources, ['requestType', 'request_type', 'RequestType']),
      employeeID: this.pickString(sources, ['employeeID', 'employee_id', 'employeeId', 'EmployeeID']),
      employmentType: this.pickString(sources, ['employmentType', 'employment_type', 'EmploymentType']),
      designation: this.pickString(sources, ['designation', 'Designation']),
      requestDate: this.pickString(sources, ['requestDate', 'request_date', 'RequestDate']),
      employeeName: this.pickString(sources, ['employeeName', 'employee_name', 'EmployeeName']),
      workGradeLevel: this.pickString(sources, ['workGradeLevel', 'work_grade_level', 'WorkGradeLevel']),
      jobTitle: this.pickString(sources, ['jobTitle', 'job_title', 'JobTitle']),
      status: this.pickString(sources, ['status', 'Status', 'approvalStatus', 'approval_status']) || 'Pending',
      employeeCategory: this.pickString(sources, ['employeeCategory', 'employee_category', 'EmployeeCategory']),
      reportingManager: this.pickString(sources, ['reportingManager', 'reporting_manager', 'ReportingManager']),
      location: this.pickString(sources, ['location', 'Location']),
      joiningDate: this.pickString(sources, ['joiningDate', 'joining_date', 'JoiningDate']),
      yearsOfService: this.pickString(sources, ['yearsOfService', 'years_of_service', 'YearsOfService']),
      payrollMonth: this.pickString(sources, ['payrollMonth', 'payroll_month', 'PayrollMonth']),
    };

    const newLoanRequest: LoanAdvanceNewLoanRequest = {
      purpose: this.pickString([newLoanSource, loanSource, item], [
        'purpose',
        'Purpose',
        'loanPurpose',
        'loan_purpose',
        'LoanPurpose',
      ]),
      loanAmountRequested: this.pickString([newLoanSource, loanSource, item], [
        'loanAmountRequested',
        'loan_amount_requested',
        'LoanAmountRequested',
      ]),
      installmentAmount: this.pickString([newLoanSource, loanSource, item], [
        'installmentAmount',
        'installment_amount',
        'InstallmentAmount',
        'loanInstallmentAmount',
        'loan_installment_amount',
        'LoanInstallmentAmount',
      ]),
      noOfInstallments: this.pickString([newLoanSource, loanSource, item], [
        'noOfInstallments',
        'no_of_installments',
        'NoOfInstallments',
      ]),
      loanEndMonth: this.pickString([newLoanSource, loanSource, item], [
        'loanEndMonth',
        'loan_end_month',
        'LoanEndMonth',
      ]),
      loanStartMonth: this.pickString([newLoanSource, loanSource, item], [
        'loanStartMonth',
        'loan_start_month',
        'LoanStartMonth',
      ]),
      loanTenure: this.pickString([newLoanSource, loanSource, item], [
        'loanTenure',
        'loan_tenure',
        'LoanTenure',
      ]),
      eligibleAmount: this.pickString([newLoanSource, loanSource, item], [
        'eligibleAmount',
        'eligible_amount',
        'EligibleAmount',
        'loanEligibleAmount',
        'loan_eligible_amount',
        'LoanEligibleAmount',
      ]),
    };

    const loanDetail: LoanAdvanceLoanDetail = {
      existingLoan: this.pickString([loanSource, item], ['existingLoan', 'existing_loan', 'ExistingLoan']),
      loanAcquiredDate: this.pickString([loanSource, item], [
        'loanAcquiredDate',
        'loan_acquired_date',
        'LoanAcquiredDate',
        'loanAcquiredMonth',
        'loan_acquired_month',
        'LoanAcquiredMonth',
      ]),
      installmentNumber: this.pickString([loanSource, item], [
        'installmentNumber',
        'installment_number',
        'InstallmentNumber',
      ]),
      loanEndingDate: this.pickString([loanSource, item], [
        'loanEndingDate',
        'loan_ending_date',
        'LoanEndingDate',
        'loanEndingMonth',
        'loan_ending_month',
        'LoanEndingMonth',
      ]),
      previousInstallmentAmount: this.pickString([loanSource, item], [
        'previousInstallmentAmount',
        'previous_installment_amount',
        'PreviousInstallmentAmount',
      ]),
      previousLoanPurpose: this.pickString([loanSource, item], [
        'previousLoanPurpose',
        'previous_loan_purpose',
        'PreviousLoanPurpose',
      ]),
      loanAmount: this.pickString([loanSource, item], ['loanAmount', 'loan_amount', 'LoanAmount']),
      loanAmountDeductedTillNow: this.pickString([loanSource, item], [
        'loanAmountDeductedTillNow',
        'loan_amount_deducted_till_now',
        'LoanAmountDeductedTillNow',
      ]),
      loanBalance: this.pickString([loanSource, item], ['loanBalance', 'loan_balance', 'LoanBalance']),
      newLoanRequest,
      remarks: this.pickString([loanSource, item], ['remarks', 'Remarks']),
    };

    const newAdvanceRequest: LoanAdvanceNewAdvanceRequest = {
      purpose: this.pickString([newAdvanceSource, advanceSource, item], [
        'purpose',
        'Purpose',
        'advancePurpose',
        'advance_purpose',
        'AdvancePurpose',
      ]),
      advanceAmountEligible: this.pickString([newAdvanceSource, advanceSource, item], [
        'advanceAmountEligible',
        'advance_amount_eligible',
        'AdvanceAmountEligible',
      ]),
      advanceAmountRequested: this.pickString([newAdvanceSource, advanceSource, item], [
        'advanceAmountRequested',
        'advance_amount_requested',
        'AdvanceAmountRequested',
      ]),
    };

    const advanceDetail: LoanAdvanceAdvanceDetail = {
      existingAdvance: this.pickString([advanceSource, item], [
        'existingAdvance',
        'existing_advance',
        'ExistingAdvance',
      ]),
      advanceAcquiredDate: this.pickString([advanceSource, item], [
        'advanceAcquiredDate',
        'advance_acquired_date',
        'AdvanceAcquiredDate',
      ]),
      advanceEligibleAmount: this.pickString([advanceSource, item], [
        'advanceEligibleAmount',
        'advance_eligible_amount',
        'AdvanceEligibleAmount',
      ]),
      previousAdvancePurpose: this.pickString([advanceSource, item], [
        'previousAdvancePurpose',
        'previous_advance_purpose',
        'PreviousAdvancePurpose',
      ]),
      advanceRemarks: this.pickString([advanceSource, item], [
        'advanceRemarks',
        'advance_remarks',
        'AdvanceRemarks',
      ]),
      advanceAmount: this.pickString([advanceSource, item], [
        'advanceAmount',
        'advance_amount',
        'AdvanceAmount',
      ]),
      advanceAmountToBeDeductedThisMonth: this.pickString([advanceSource, item], [
        'advanceAmountToBeDeductedThisMonth',
        'advance_amount_to_be_deducted_this_month',
        'AdvanceAmountToBeDeductedThisMonth',
      ]),
      advanceBalance: this.pickString([advanceSource, item], [
        'advanceBalance',
        'advance_balance',
        'AdvanceBalance',
      ]),
      newAdvanceRequest,
    };

    const repaymentSchedule: LoanAdvanceRepaymentSchedule = {
      repaymentStartDate: this.pickString([repaymentSource, item], [
        'repaymentStartDate',
        'repayment_start_date',
      ]),
      repaymentFrequency: this.pickString([repaymentSource, item], [
        'repaymentFrequency',
        'repayment_frequency',
      ]),
      deductionAmount: this.pickString([repaymentSource, item], ['deductionAmount', 'deduction_amount']),
      remarks: this.pickString([repaymentSource, item], ['remarks', 'Remarks']),
    };

    return {
      Id: Number.parseInt(id, 10) || 0,
      DocumentNo: headerInfo.documentNo || '—',
      EmployeeID: headerInfo.employeeID || '—',
      EmployeeName: headerInfo.employeeName || '—',
      Department: headerInfo.department || '—',
      RequestType: headerInfo.requestType || '—',
      RequestDate: headerInfo.requestDate || '—',
      Status: headerInfo.status || '—',
      EmployeeNature: headerInfo.employeeNature || '—',
      EmploymentType: headerInfo.employmentType || '—',
      Designation: headerInfo.designation || '—',
      WorkGradeLevel: headerInfo.workGradeLevel || '—',
      JobTitle: headerInfo.jobTitle || '—',
      EmployeeCategory: headerInfo.employeeCategory || '—',
      ReportingManager: headerInfo.reportingManager || '—',
      Location: headerInfo.location || '—',
      JoiningDate: headerInfo.joiningDate || '—',
      YearsOfService: headerInfo.yearsOfService || '—',
      PayrollMonth: headerInfo.payrollMonth || '—',
      ExistingLoan: loanDetail.existingLoan || '—',
      LoanAmountRequested: newLoanRequest.loanAmountRequested || '—',
      LoanInstallmentAmount: newLoanRequest.installmentAmount || '—',
      NoOfInstallments: newLoanRequest.noOfInstallments || '—',
      LoanPurpose: newLoanRequest.purpose || '—',
      LoanEligibleAmount: newLoanRequest.eligibleAmount || '—',
      ExistingAdvance: advanceDetail.existingAdvance || '—',
      AdvanceAmountRequested: newAdvanceRequest.advanceAmountRequested || '—',
      AdvancePurpose: newAdvanceRequest.purpose || '—',
      AdvanceEligibleAmount:
        newAdvanceRequest.advanceAmountEligible || advanceDetail.advanceEligibleAmount || '—',
      RepaymentStartDate: repaymentSchedule.repaymentStartDate || '—',
      RepaymentFrequency: repaymentSchedule.repaymentFrequency || '—',
      DeductionAmount: repaymentSchedule.deductionAmount || '—',
      HeaderInfo: headerInfo,
      LoanDetail: loanDetail,
      AdvanceDetail: advanceDetail,
      RepaymentSchedule: repaymentSchedule,
      selected: false,
    };
  }
}
