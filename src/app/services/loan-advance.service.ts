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
    return this.http.post<LoanAdvanceResponse>(LOAN_ADVANCE_ADD_URL, payload).pipe(
      tap((response) => {
        const id = this.extractResponseId(response);
        if (id) {
          this.cachePayload(id, payload);
        }
      }),
    );
  }

  updateLoanAdvance(id: string | number, payload: LoanAdvancePayload): Observable<LoanAdvanceResponse> {
    const identifier = encodeURIComponent(String(id));
    const numericId = Number.parseInt(String(id), 10) || 0;
    return this.http.post<LoanAdvanceResponse>(`${LOAN_ADVANCE_UPDATE_URL}/${identifier}`, payload).pipe(
      tap(() => {
        if (numericId) {
          this.cachePayload(numericId, payload);
        }
      }),
    );
  }

  fetchLoanAdvanceDetail(id: string | number): Observable<LoanAdvanceRecord> {
    const numericId = Number.parseInt(String(id), 10) || 0;
    const cached = this.findLoanById(id);
    if (cached && this.recordHasFormData(cached)) {
      return of(this.ensureRecordId(cached, numericId));
    }

    const cachedPayload = this.getCachedPayload(id);
    if (cachedPayload) {
      return of(this.buildRecordFromPayload(numericId, cachedPayload));
    }

    const identifier = encodeURIComponent(String(id));
    return this.http.get<unknown>(`${LOAN_ADVANCE_DETAIL_URL}/${identifier}`).pipe(
      map((response) => this.ensureRecordId(this.mapDetailResponse(response), numericId)),
      catchError(() => this.resolveLoanAdvanceFromList(numericId)),
    );
  }

  loadRecordForEdit(id: string | number): Observable<LoanAdvanceRecord> {
    const numericId = Number.parseInt(String(id), 10) || 0;
    const cachedPayload = this.getCachedPayload(id);
    if (cachedPayload) {
      return of(this.buildRecordFromPayload(numericId, cachedPayload));
    }

    return this.fetchLoanAdvances().pipe(
      switchMap((records) => {
        const fromList = records.find((item) => item.Id === numericId);
        if (fromList && this.recordHasFormData(fromList)) {
          return of(fromList);
        }

        return this.fetchLoanAdvanceDetail(id);
      }),
      catchError(() => this.fetchLoanAdvanceDetail(id)),
    );
  }

  cachePayload(id: string | number, payload: LoanAdvancePayload): void {
    const numericId = Number.parseInt(String(id), 10);
    if (!numericId) {
      return;
    }

    try {
      sessionStorage.setItem(this.payloadStorageKey(numericId), JSON.stringify(payload));
    } catch {
      // Ignore storage failures and keep the in-memory list as fallback.
    }
  }

  getCachedPayload(id: string | number): LoanAdvancePayload | null {
    const numericId = Number.parseInt(String(id), 10);
    if (!numericId) {
      return null;
    }

    try {
      const raw = sessionStorage.getItem(this.payloadStorageKey(numericId));
      if (!raw) {
        return null;
      }

      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return parsed as LoanAdvancePayload;
    } catch {
      return null;
    }
  }

  buildPayloadFromRecord(record: LoanAdvanceRecord): LoanAdvancePayload {
    const pick = (...values: Array<string | undefined>): string => this.pickDisplayValue(...values);

    return {
      headerInfo: {
        documentNo: pick(record.HeaderInfo.documentNo, record.DocumentNo),
        employeeNature: pick(record.HeaderInfo.employeeNature, record.EmployeeNature),
        department: pick(record.HeaderInfo.department, record.Department),
        requestType: pick(record.HeaderInfo.requestType, record.RequestType),
        employeeID: pick(record.HeaderInfo.employeeID, record.EmployeeID),
        employmentType: pick(record.HeaderInfo.employmentType, record.EmploymentType),
        designation: pick(record.HeaderInfo.designation, record.Designation),
        requestDate: pick(record.HeaderInfo.requestDate, record.RequestDate),
        employeeName: pick(record.HeaderInfo.employeeName, record.EmployeeName),
        workGradeLevel: pick(record.HeaderInfo.workGradeLevel, record.WorkGradeLevel),
        jobTitle: pick(record.HeaderInfo.jobTitle, record.JobTitle),
        status: pick(record.HeaderInfo.status, record.Status, 'Pending'),
        employeeCategory: pick(record.HeaderInfo.employeeCategory, record.EmployeeCategory),
        reportingManager: pick(record.HeaderInfo.reportingManager, record.ReportingManager),
        location: pick(record.HeaderInfo.location, record.Location),
        joiningDate: pick(record.HeaderInfo.joiningDate, record.JoiningDate),
        yearsOfService: pick(record.HeaderInfo.yearsOfService, record.YearsOfService),
        payrollMonth: pick(record.HeaderInfo.payrollMonth, record.PayrollMonth),
      },
      loanDetail: {
        existingLoan: pick(record.LoanDetail.existingLoan, record.ExistingLoan),
        loanAcquiredDate: record.LoanDetail.loanAcquiredDate ?? '',
        installmentNumber: record.LoanDetail.installmentNumber ?? '',
        loanEndingDate: record.LoanDetail.loanEndingDate ?? '',
        previousInstallmentAmount: record.LoanDetail.previousInstallmentAmount ?? '',
        previousLoanPurpose: record.LoanDetail.previousLoanPurpose ?? '',
        loanAmount: record.LoanDetail.loanAmount ?? '',
        loanAmountDeductedTillNow: record.LoanDetail.loanAmountDeductedTillNow ?? '',
        loanBalance: record.LoanDetail.loanBalance ?? '',
        newLoanRequest: {
          purpose: pick(record.LoanDetail.newLoanRequest.purpose, record.LoanPurpose),
          loanAmountRequested: pick(
            record.LoanDetail.newLoanRequest.loanAmountRequested,
            record.LoanAmountRequested,
          ),
          installmentAmount: pick(
            record.LoanDetail.newLoanRequest.installmentAmount,
            record.LoanInstallmentAmount,
          ),
          noOfInstallments: pick(
            record.LoanDetail.newLoanRequest.noOfInstallments,
            record.NoOfInstallments,
          ),
          loanEndMonth: record.LoanDetail.newLoanRequest.loanEndMonth ?? '',
          loanStartMonth: record.LoanDetail.newLoanRequest.loanStartMonth ?? '',
          loanTenure: record.LoanDetail.newLoanRequest.loanTenure ?? '',
          eligibleAmount: pick(
            record.LoanDetail.newLoanRequest.eligibleAmount,
            record.LoanEligibleAmount,
          ),
        },
        remarks: record.LoanDetail.remarks ?? '',
      },
      advanceDetail: {
        existingAdvance: pick(record.AdvanceDetail.existingAdvance, record.ExistingAdvance),
        advanceAcquiredDate: record.AdvanceDetail.advanceAcquiredDate ?? '',
        advanceEligibleAmount: pick(
          record.AdvanceDetail.advanceEligibleAmount,
          record.AdvanceEligibleAmount,
        ),
        previousAdvancePurpose: record.AdvanceDetail.previousAdvancePurpose ?? '',
        advanceRemarks: record.AdvanceDetail.advanceRemarks ?? '',
        advanceAmount: record.AdvanceDetail.advanceAmount ?? '',
        advanceAmountToBeDeductedThisMonth:
          record.AdvanceDetail.advanceAmountToBeDeductedThisMonth ?? '',
        advanceBalance: record.AdvanceDetail.advanceBalance ?? '',
        newAdvanceRequest: {
          purpose: pick(record.AdvanceDetail.newAdvanceRequest.purpose, record.AdvancePurpose),
          advanceAmountEligible: pick(
            record.AdvanceDetail.newAdvanceRequest.advanceAmountEligible,
            record.AdvanceEligibleAmount,
          ),
          advanceAmountRequested: pick(
            record.AdvanceDetail.newAdvanceRequest.advanceAmountRequested,
            record.AdvanceAmountRequested,
          ),
        },
      },
      repaymentSchedule: {
        repaymentStartDate: pick(
          record.RepaymentSchedule.repaymentStartDate,
          record.RepaymentStartDate,
        ),
        repaymentFrequency: pick(
          record.RepaymentSchedule.repaymentFrequency,
          record.RepaymentFrequency,
        ),
        deductionAmount: pick(record.RepaymentSchedule.deductionAmount, record.DeductionAmount),
        remarks: record.RepaymentSchedule.remarks ?? '',
      },
    };
  }

  buildRecordFromPayload(id: string | number, payload: LoanAdvancePayload): LoanAdvanceRecord {
    return this.mapApiItemToRecord({
      id: Number.parseInt(String(id), 10) || 0,
      headerInfo: payload.headerInfo,
      loanDetail: payload.loanDetail,
      advanceDetail: payload.advanceDetail,
      repaymentSchedule: payload.repaymentSchedule,
    });
  }

  recordHasFormData(record: LoanAdvanceRecord): boolean {
    return Boolean(
      this.pickDisplayValue(record.HeaderInfo.documentNo, record.DocumentNo) ||
        this.pickDisplayValue(record.HeaderInfo.employeeID, record.EmployeeID) ||
        this.pickDisplayValue(record.HeaderInfo.requestType, record.RequestType) ||
        this.pickDisplayValue(
          record.LoanDetail.newLoanRequest.loanAmountRequested,
          record.LoanAmountRequested,
        ) ||
        this.pickDisplayValue(
          record.AdvanceDetail.newAdvanceRequest.advanceAmountRequested,
          record.AdvanceAmountRequested,
        ),
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
    if (fromCache && this.recordHasFormData(fromCache)) {
      return of(fromCache);
    }

    const cachedPayload = this.getCachedPayload(numericId);
    if (cachedPayload) {
      return of(this.buildRecordFromPayload(numericId, cachedPayload));
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
      obj['DocumentNo'] ||
      obj['employee_id'] ||
      obj['employeeId'] ||
      obj['employeeID'] ||
      obj['loan_amount_requested'] ||
      obj['loanAmountRequested']
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
    const asString = (value: unknown): string => {
      if (value === undefined || value === null) {
        return '';
      }
      const text = String(value).trim();
      if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') {
        return '';
      }
      return text;
    };

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

  private normalizeApiItem(item: Record<string, unknown>): Record<string, unknown> {
    let normalized: Record<string, unknown> = { ...item };

    const payloadKeys = [
      'payload',
      'form_data',
      'formData',
      'loan_advance_data',
      'loanAdvanceData',
      'loan_advance_payload',
      'loanAdvancePayload',
      'request_payload',
      'requestPayload',
      'loan_advance',
      'loanAdvance',
      'record',
      'Record',
    ];

    for (const key of payloadKeys) {
      const unwrapped = this.asRecord(item[key]);
      if (Object.keys(unwrapped).length > 0) {
        normalized = { ...normalized, ...unwrapped };
      }
    }

    return normalized;
  }

  private mergeSection(
    item: Record<string, unknown>,
    sectionKeys: string[],
    flatFields: Record<string, unknown>,
  ): Record<string, unknown> {
    const nested = this.asRecord(
      sectionKeys.reduce<unknown>((current, key) => current ?? item[key], undefined),
    );

    const merged: Record<string, unknown> = { ...flatFields };
    for (const [key, value] of Object.entries(nested)) {
      if (!this.hasMeaningfulValue(value)) {
        continue;
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = {
          ...this.asRecord(merged[key]),
          ...(value as Record<string, unknown>),
        };
        continue;
      }

      merged[key] = value;
    }

    return merged;
  }

  private hasMeaningfulValue(value: unknown): boolean {
    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === 'string') {
      const text = value.trim();
      return Boolean(text && text.toLowerCase() !== 'null' && text.toLowerCase() !== 'undefined');
    }

    if (Array.isArray(value)) {
      return value.some((entry) => this.hasMeaningfulValue(entry));
    }

    if (typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).some((entry) =>
        this.hasMeaningfulValue(entry),
      );
    }

    return true;
  }

  private pickDisplayValue(...values: Array<string | undefined>): string {
    for (const value of values) {
      const text = (value ?? '').trim();
      if (text && text !== '—' && text.toLowerCase() !== 'null' && text.toLowerCase() !== 'undefined') {
        return text;
      }
    }
    return '';
  }

  private payloadStorageKey(id: number): string {
    return `loan-advance-payload:${id}`;
  }

  private extractResponseId(response: LoanAdvanceResponse): number {
    const data = response.data;
    if (!data || typeof data !== 'object') {
      return 0;
    }

    const idValue = data['id'] ?? data['Id'] ?? data['loan_advance_id'] ?? data['loanAdvanceId'];
    return Number.parseInt(String(idValue ?? ''), 10) || 0;
  }

  private extractFlatHeader(item: Record<string, unknown>): Record<string, unknown> {
    return {
      documentNo: this.pickString([item], ['documentNo', 'document_no', 'DocumentNo']),
      employeeNature: this.pickString([item], ['employeeNature', 'employee_nature', 'EmployeeNature']),
      department: this.pickString([item], ['department', 'Department']),
      requestType: this.pickString([item], ['requestType', 'request_type', 'RequestType']),
      employeeID: this.pickString([item], ['employeeID', 'employee_id', 'employeeId', 'EmployeeID']),
      employmentType: this.pickString([item], ['employmentType', 'employment_type', 'EmploymentType']),
      designation: this.pickString([item], ['designation', 'Designation']),
      requestDate: this.pickString([item], ['requestDate', 'request_date', 'RequestDate']),
      employeeName: this.pickString([item], ['employeeName', 'employee_name', 'EmployeeName']),
      workGradeLevel: this.pickString([item], ['workGradeLevel', 'work_grade_level', 'WorkGradeLevel']),
      jobTitle: this.pickString([item], ['jobTitle', 'job_title', 'JobTitle']),
      status: this.pickString([item], ['status', 'Status', 'approvalStatus', 'approval_status']),
      employeeCategory: this.pickString([item], ['employeeCategory', 'employee_category', 'EmployeeCategory']),
      reportingManager: this.pickString([item], ['reportingManager', 'reporting_manager', 'ReportingManager']),
      location: this.pickString([item], ['location', 'Location', 'branch', 'Branch']),
      joiningDate: this.pickString([item], ['joiningDate', 'joining_date', 'JoiningDate']),
      yearsOfService: this.pickString([item], ['yearsOfService', 'years_of_service', 'YearsOfService']),
      payrollMonth: this.pickString([item], ['payrollMonth', 'payroll_month', 'PayrollMonth']),
    };
  }

  private extractFlatLoanDetail(item: Record<string, unknown>): Record<string, unknown> {
    return {
      existingLoan: this.pickString([item], ['existingLoan', 'existing_loan', 'ExistingLoan']),
      loanAcquiredDate: this.pickString([item], [
        'loanAcquiredDate',
        'loan_acquired_date',
        'LoanAcquiredDate',
        'loanAcquiredMonth',
        'loan_acquired_month',
      ]),
      installmentNumber: this.pickString([item], ['installmentNumber', 'installment_number', 'InstallmentNumber']),
      loanEndingDate: this.pickString([item], [
        'loanEndingDate',
        'loan_ending_date',
        'LoanEndingDate',
        'loanEndingMonth',
        'loan_ending_month',
      ]),
      previousInstallmentAmount: this.pickString([item], [
        'previousInstallmentAmount',
        'previous_installment_amount',
        'PreviousInstallmentAmount',
      ]),
      previousLoanPurpose: this.pickString([item], [
        'previousLoanPurpose',
        'previous_loan_purpose',
        'PreviousLoanPurpose',
      ]),
      loanAmount: this.pickString([item], ['loanAmount', 'loan_amount', 'LoanAmount']),
      loanAmountDeductedTillNow: this.pickString([item], [
        'loanAmountDeductedTillNow',
        'loan_amount_deducted_till_now',
        'LoanAmountDeductedTillNow',
      ]),
      loanBalance: this.pickString([item], ['loanBalance', 'loan_balance', 'LoanBalance']),
      remarks: this.pickString([item], ['loanRemarks', 'loan_remarks', 'LoanRemarks', 'remarks', 'Remarks']),
    };
  }

  private extractFlatNewLoanRequest(
    item: Record<string, unknown>,
    loanSource: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      purpose: this.pickString([loanSource, item], ['purpose', 'Purpose', 'loanPurpose', 'loan_purpose', 'LoanPurpose']),
      loanAmountRequested: this.pickString([loanSource, item], [
        'loanAmountRequested',
        'loan_amount_requested',
        'LoanAmountRequested',
      ]),
      installmentAmount: this.pickString([loanSource, item], [
        'installmentAmount',
        'installment_amount',
        'InstallmentAmount',
        'loanInstallmentAmount',
        'loan_installment_amount',
        'LoanInstallmentAmount',
      ]),
      noOfInstallments: this.pickString([loanSource, item], [
        'noOfInstallments',
        'no_of_installments',
        'NoOfInstallments',
      ]),
      loanEndMonth: this.pickString([loanSource, item], ['loanEndMonth', 'loan_end_month', 'LoanEndMonth']),
      loanStartMonth: this.pickString([loanSource, item], ['loanStartMonth', 'loan_start_month', 'LoanStartMonth']),
      loanTenure: this.pickString([loanSource, item], ['loanTenure', 'loan_tenure', 'LoanTenure']),
      eligibleAmount: this.pickString([loanSource, item], [
        'eligibleAmount',
        'eligible_amount',
        'EligibleAmount',
        'loanEligibleAmount',
        'loan_eligible_amount',
        'LoanEligibleAmount',
      ]),
    };
  }

  private extractFlatAdvanceDetail(item: Record<string, unknown>): Record<string, unknown> {
    return {
      existingAdvance: this.pickString([item], ['existingAdvance', 'existing_advance', 'ExistingAdvance']),
      advanceAcquiredDate: this.pickString([item], [
        'advanceAcquiredDate',
        'advance_acquired_date',
        'AdvanceAcquiredDate',
      ]),
      advanceEligibleAmount: this.pickString([item], [
        'advanceEligibleAmount',
        'advance_eligible_amount',
        'AdvanceEligibleAmount',
      ]),
      previousAdvancePurpose: this.pickString([item], [
        'previousAdvancePurpose',
        'previous_advance_purpose',
        'PreviousAdvancePurpose',
      ]),
      advanceRemarks: this.pickString([item], ['advanceRemarks', 'advance_remarks', 'AdvanceRemarks']),
      advanceAmount: this.pickString([item], ['advanceAmount', 'advance_amount', 'AdvanceAmount']),
      advanceAmountToBeDeductedThisMonth: this.pickString([item], [
        'advanceAmountToBeDeductedThisMonth',
        'advance_amount_to_be_deducted_this_month',
        'AdvanceAmountToBeDeductedThisMonth',
      ]),
      advanceBalance: this.pickString([item], ['advanceBalance', 'advance_balance', 'AdvanceBalance']),
    };
  }

  private extractFlatNewAdvanceRequest(
    item: Record<string, unknown>,
    advanceSource: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      purpose: this.pickString([advanceSource, item], [
        'purpose',
        'Purpose',
        'advancePurpose',
        'advance_purpose',
        'AdvancePurpose',
      ]),
      advanceAmountEligible: this.pickString([advanceSource, item], [
        'advanceAmountEligible',
        'advance_amount_eligible',
        'AdvanceAmountEligible',
      ]),
      advanceAmountRequested: this.pickString([advanceSource, item], [
        'advanceAmountRequested',
        'advance_amount_requested',
        'AdvanceAmountRequested',
      ]),
    };
  }

  private extractFlatRepaymentSchedule(item: Record<string, unknown>): Record<string, unknown> {
    return {
      repaymentStartDate: this.pickString([item], [
        'repaymentStartDate',
        'repayment_start_date',
        'RepaymentStartDate',
      ]),
      repaymentFrequency: this.pickString([item], [
        'repaymentFrequency',
        'repayment_frequency',
        'RepaymentFrequency',
      ]),
      deductionAmount: this.pickString([item], ['deductionAmount', 'deduction_amount', 'DeductionAmount']),
      remarks: this.pickString([item], [
        'repaymentRemarks',
        'repayment_remarks',
        'RepaymentRemarks',
      ]),
    };
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
    const normalizedItem = this.normalizeApiItem(item);
    const headerSource = this.mergeSection(
      normalizedItem,
      ['headerInfo', 'header_info', 'HeaderInfo'],
      this.extractFlatHeader(normalizedItem),
    );
    const loanSource = this.mergeSection(
      normalizedItem,
      ['loanDetail', 'loan_detail', 'LoanDetail'],
      this.extractFlatLoanDetail(normalizedItem),
    );
    const advanceSource = this.mergeSection(
      normalizedItem,
      ['advanceDetail', 'advance_detail', 'AdvanceDetail'],
      this.extractFlatAdvanceDetail(normalizedItem),
    );
    const repaymentSource = this.mergeSection(
      normalizedItem,
      ['repaymentSchedule', 'repayment_schedule', 'RepaymentSchedule'],
      this.extractFlatRepaymentSchedule(normalizedItem),
    );
    const newLoanSource = this.mergeSection(
      loanSource,
      ['newLoanRequest', 'new_loan_request', 'NewLoanRequest'],
      this.extractFlatNewLoanRequest(normalizedItem, loanSource),
    );
    const newAdvanceSource = this.mergeSection(
      advanceSource,
      ['newAdvanceRequest', 'new_advance_request', 'NewAdvanceRequest'],
      this.extractFlatNewAdvanceRequest(normalizedItem, advanceSource),
    );

    const sources = [headerSource, loanSource, advanceSource, repaymentSource, newLoanSource, newAdvanceSource, normalizedItem];
    const id = this.pickString([normalizedItem], ['id', 'Id', 'loan_advance_id', 'loanAdvanceId']);

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
      purpose: this.pickString([newLoanSource, loanSource, normalizedItem], [
        'purpose',
        'Purpose',
        'loanPurpose',
        'loan_purpose',
        'LoanPurpose',
      ]),
      loanAmountRequested: this.pickString([newLoanSource, loanSource, normalizedItem], [
        'loanAmountRequested',
        'loan_amount_requested',
        'LoanAmountRequested',
      ]),
      installmentAmount: this.pickString([newLoanSource, loanSource, normalizedItem], [
        'installmentAmount',
        'installment_amount',
        'InstallmentAmount',
        'loanInstallmentAmount',
        'loan_installment_amount',
        'LoanInstallmentAmount',
      ]),
      noOfInstallments: this.pickString([newLoanSource, loanSource, normalizedItem], [
        'noOfInstallments',
        'no_of_installments',
        'NoOfInstallments',
      ]),
      loanEndMonth: this.pickString([newLoanSource, loanSource, normalizedItem], [
        'loanEndMonth',
        'loan_end_month',
        'LoanEndMonth',
      ]),
      loanStartMonth: this.pickString([newLoanSource, loanSource, normalizedItem], [
        'loanStartMonth',
        'loan_start_month',
        'LoanStartMonth',
      ]),
      loanTenure: this.pickString([newLoanSource, loanSource, normalizedItem], [
        'loanTenure',
        'loan_tenure',
        'LoanTenure',
      ]),
      eligibleAmount: this.pickString([newLoanSource, loanSource, normalizedItem], [
        'eligibleAmount',
        'eligible_amount',
        'EligibleAmount',
        'loanEligibleAmount',
        'loan_eligible_amount',
        'LoanEligibleAmount',
      ]),
    };

    const loanDetail: LoanAdvanceLoanDetail = {
      existingLoan: this.pickString([loanSource, normalizedItem], ['existingLoan', 'existing_loan', 'ExistingLoan']),
      loanAcquiredDate: this.pickString([loanSource, normalizedItem], [
        'loanAcquiredDate',
        'loan_acquired_date',
        'LoanAcquiredDate',
        'loanAcquiredMonth',
        'loan_acquired_month',
        'LoanAcquiredMonth',
      ]),
      installmentNumber: this.pickString([loanSource, normalizedItem], [
        'installmentNumber',
        'installment_number',
        'InstallmentNumber',
      ]),
      loanEndingDate: this.pickString([loanSource, normalizedItem], [
        'loanEndingDate',
        'loan_ending_date',
        'LoanEndingDate',
        'loanEndingMonth',
        'loan_ending_month',
        'LoanEndingMonth',
      ]),
      previousInstallmentAmount: this.pickString([loanSource, normalizedItem], [
        'previousInstallmentAmount',
        'previous_installment_amount',
        'PreviousInstallmentAmount',
      ]),
      previousLoanPurpose: this.pickString([loanSource, normalizedItem], [
        'previousLoanPurpose',
        'previous_loan_purpose',
        'PreviousLoanPurpose',
      ]),
      loanAmount: this.pickString([loanSource, normalizedItem], ['loanAmount', 'loan_amount', 'LoanAmount']),
      loanAmountDeductedTillNow: this.pickString([loanSource, normalizedItem], [
        'loanAmountDeductedTillNow',
        'loan_amount_deducted_till_now',
        'LoanAmountDeductedTillNow',
      ]),
      loanBalance: this.pickString([loanSource, normalizedItem], ['loanBalance', 'loan_balance', 'LoanBalance']),
      newLoanRequest,
      remarks: this.pickString([loanSource, normalizedItem], ['remarks', 'Remarks']),
    };

    const newAdvanceRequest: LoanAdvanceNewAdvanceRequest = {
      purpose: this.pickString([newAdvanceSource, advanceSource, normalizedItem], [
        'purpose',
        'Purpose',
        'advancePurpose',
        'advance_purpose',
        'AdvancePurpose',
      ]),
      advanceAmountEligible: this.pickString([newAdvanceSource, advanceSource, normalizedItem], [
        'advanceAmountEligible',
        'advance_amount_eligible',
        'AdvanceAmountEligible',
      ]),
      advanceAmountRequested: this.pickString([newAdvanceSource, advanceSource, normalizedItem], [
        'advanceAmountRequested',
        'advance_amount_requested',
        'AdvanceAmountRequested',
      ]),
    };

    const advanceDetail: LoanAdvanceAdvanceDetail = {
      existingAdvance: this.pickString([advanceSource, normalizedItem], [
        'existingAdvance',
        'existing_advance',
        'ExistingAdvance',
      ]),
      advanceAcquiredDate: this.pickString([advanceSource, normalizedItem], [
        'advanceAcquiredDate',
        'advance_acquired_date',
        'AdvanceAcquiredDate',
      ]),
      advanceEligibleAmount: this.pickString([advanceSource, normalizedItem], [
        'advanceEligibleAmount',
        'advance_eligible_amount',
        'AdvanceEligibleAmount',
      ]),
      previousAdvancePurpose: this.pickString([advanceSource, normalizedItem], [
        'previousAdvancePurpose',
        'previous_advance_purpose',
        'PreviousAdvancePurpose',
      ]),
      advanceRemarks: this.pickString([advanceSource, normalizedItem], [
        'advanceRemarks',
        'advance_remarks',
        'AdvanceRemarks',
      ]),
      advanceAmount: this.pickString([advanceSource, normalizedItem], [
        'advanceAmount',
        'advance_amount',
        'AdvanceAmount',
      ]),
      advanceAmountToBeDeductedThisMonth: this.pickString([advanceSource, normalizedItem], [
        'advanceAmountToBeDeductedThisMonth',
        'advance_amount_to_be_deducted_this_month',
        'AdvanceAmountToBeDeductedThisMonth',
      ]),
      advanceBalance: this.pickString([advanceSource, normalizedItem], [
        'advanceBalance',
        'advance_balance',
        'AdvanceBalance',
      ]),
      newAdvanceRequest,
    };

    const repaymentSchedule: LoanAdvanceRepaymentSchedule = {
      repaymentStartDate: this.pickString([repaymentSource, normalizedItem], [
        'repaymentStartDate',
        'repayment_start_date',
      ]),
      repaymentFrequency: this.pickString([repaymentSource, normalizedItem], [
        'repaymentFrequency',
        'repayment_frequency',
      ]),
      deductionAmount: this.pickString([repaymentSource, normalizedItem], ['deductionAmount', 'deduction_amount']),
      remarks: this.pickString([repaymentSource, normalizedItem], ['remarks', 'Remarks']),
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
