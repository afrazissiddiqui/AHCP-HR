import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface FinalSettlementHeaderSection {
  employeeId: number;
  employeeName: string;
  department: string;
  employeeCategory: string;
  designation: string;
  branchLocation: string;
  costCenter: string;
  workGradeLevel: string;
  lastWorkingDay: string;
  yearOfService: number;
  releasingDate: string;
  grossMonthlySalary: number;
  committeeMeetingHeld: string;
}

export interface FinalSettlementDuesPayable {
  duesFromDate: string;
  duesToDate: string;
  noOfDaysSalaryNotPaid: number;
  salaryPayable: number;
  gratuity: number;
  overtimeAmount: number;
  noticePay: number;
  leaveEncashmentAmount: number;
  otherPayables: number;
  totalDuesPayable: number;
}

export interface FinalSettlementRecoverableAmountSection {
  salaryAdvances: number;
  outstandingLoanBalance: number;
  incomeTaxDeductions: number;
  recoverableNoticePay: number;
  leaveWithoutPay: number;
  assetsHandledOver: string;
  assetRecovered: string;
  assetRecoveryName: string;
  otherRecoverableAmounts: number;
  sss: number;
  totalRecoverableAmount: number;
}

export interface FinalSettlementAddPayload {
  headerSection: FinalSettlementHeaderSection;
  duesPayable: FinalSettlementDuesPayable;
  recoverableAmountSection: FinalSettlementRecoverableAmountSection;
}

export interface FinalSettlementResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
}

export interface TerminationDuesPayable {
  duesFromDate: string;
  duesToDate: string;
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
  recoverableNoticePay: string;
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
  Id: number;
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

const FINAL_SETTLEMENT_LIST_URL = apiUrl('final-settlement-list');
const FINAL_SETTLEMENT_ADD_URL = apiUrl('final-settlement-add');
const FINAL_SETTLEMENT_DETAIL_URL = apiUrl('final-settlement-detail');
const FINAL_SETTLEMENT_UPDATE_URL = apiUrl('final-settlement-update');
const FINAL_SETTLEMENT_DELETE_URL = apiUrl('final-settlement-delete');

@Injectable({
  providedIn: 'root',
})
export class TerminationService {
  private readonly http = inject(HttpClient);
  private readonly recordList = signal<TerminationRecord[]>([]);

  readonly terminations = this.recordList.asReadonly();

  fetchFinalSettlements(): Observable<TerminationRecord[]> {
    return this.http.get<unknown>(FINAL_SETTLEMENT_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => this.recordList.set(records)),
    );
  }

  addFinalSettlement(payload: FinalSettlementAddPayload): Observable<FinalSettlementResponse> {
    return this.http.post<FinalSettlementResponse>(FINAL_SETTLEMENT_ADD_URL, payload);
  }

  updateFinalSettlement(
    id: string | number,
    payload: FinalSettlementAddPayload,
  ): Observable<FinalSettlementResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post<FinalSettlementResponse>(`${FINAL_SETTLEMENT_UPDATE_URL}/${identifier}`, payload);
  }

  fetchFinalSettlementDetail(id: string | number): Observable<TerminationRecord> {
    const identifier = encodeURIComponent(String(id));
    const numericId = Number.parseInt(String(id), 10) || 0;

    return this.http.get<unknown>(`${FINAL_SETTLEMENT_DETAIL_URL}/${identifier}`).pipe(
      map((response) => {
        const record = this.mapDetailResponse(response);
        if (!record.Id && numericId) {
          return { ...record, Id: numericId };
        }
        return record;
      }),
    );
  }

  deleteFinalSettlement(id: string | number): Observable<FinalSettlementResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete<FinalSettlementResponse>(`${FINAL_SETTLEMENT_DELETE_URL}/${identifier}`);
  }

  getTerminationRecords(): TerminationRecord[] {
    return this.recordList();
  }

  removeTerminationRecord(record: TerminationRecord): void {
    this.recordList.update((list) => list.filter((item) => item.Id !== record.Id));
  }

  findTerminationById(id: string | number): TerminationRecord | undefined {
    const numericId = Number.parseInt(String(id), 10);
    return this.recordList().find((item) => item.Id === numericId);
  }

  private mapDetailResponse(response: unknown): TerminationRecord {
    const items = this.extractApiItems(response);
    if (items.length > 0) {
      return this.mapApiItemToRecord(items[0]);
    }

    if (response && typeof response === 'object') {
      return this.mapApiItemToRecord(response as Record<string, unknown>);
    }

    throw new Error('Final settlement record not found');
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
      'final_settlements',
      'finalSettlements',
      'finalSettlementList',
      'terminations',
      'terminationList',
      'settlements',
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
      obj['headerSection'] ||
      obj['header_section'] ||
      obj['duesPayable'] ||
      obj['dues_payable'] ||
      obj['recoverableAmount'] ||
      obj['recoverable_amount'] ||
      obj['recoverableAmountSection'] ||
      obj['recoverable_amount_section'] ||
      obj['employeeId'] ||
      obj['employee_id'] ||
      obj['EmployeeId']
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
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value).trim();
        }
      }
    }
    return '';
  }

  private pickNumber(sources: Array<Record<string, unknown>>, keys: string[]): number {
    const text = this.pickString(sources, keys);
    const parsed = Number.parseFloat(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private mapApiItemToRecord(item: Record<string, unknown>): TerminationRecord {
    const headerSource = this.asRecord(
      item['headerInfo'] ??
        item['header_info'] ??
        item['HeaderInfo'] ??
        item['headerSection'] ??
        item['header_section'],
    );
    const duesSource = this.asRecord(
      item['duesPayable'] ?? item['dues_payable'] ?? item['DuesPayable'] ?? item['duesPayableSection'],
    );
    const recoverableSource = this.asRecord(
      item['recoverableAmount'] ??
        item['recoverable_amount'] ??
        item['RecoverableAmount'] ??
        item['recoverableAmountSection'],
    );
    const detailSource = this.asRecord(item['detail'] ?? item['Detail']);

    const sources = [headerSource, duesSource, recoverableSource, detailSource, item];
    const id = this.pickString([item], ['id', 'Id', 'final_settlement_id', 'termination_id']);

    const duesPayable: TerminationDuesPayable = {
      duesFromDate: this.pickString([duesSource, detailSource, item], [
        'duesFromDate',
        'dues_from_date',
        'fromDate',
        'from_date',
      ]),
      duesToDate: this.pickString([duesSource, detailSource, item], [
        'duesToDate',
        'dues_to_date',
        'toDate',
        'to_date',
      ]),
      noOfDaysSalaryNotPaid: this.pickString([duesSource, item], [
        'noOfDaysSalaryNotPaid',
        'no_of_days_salary_not_paid',
      ]),
      salaryPayable: this.pickString([duesSource, item], ['salaryPayable', 'salary_payable']),
      gratuity: this.pickString([duesSource, item], ['gratuity', 'Gratuity']),
      overtimeAmount: this.pickString([duesSource, item], ['overtimeAmount', 'overtime_amount']),
      noticePay: this.pickString([duesSource, item], ['noticePay', 'notice_pay']),
      leaveEncashmentAmount: this.pickString([duesSource, item], [
        'leaveEncashmentAmount',
        'leave_encashment_amount',
      ]),
      otherPayables: this.pickString([duesSource, item], ['otherPayables', 'other_payables']),
    };

    const recoverableAmount: TerminationRecoverableAmount = {
      salaryAdvances: this.pickString([recoverableSource, item], ['salaryAdvances', 'salary_advances']),
      outstandingLoanBalance: this.pickString([recoverableSource, item], [
        'outstandingLoanBalance',
        'outstanding_loan_balance',
      ]),
      incomeTaxDeductions: this.pickString([recoverableSource, item], [
        'incomeTaxDeductions',
        'income_tax_deductions',
      ]),
      recoverableNoticePay: this.pickString([recoverableSource, item], [
        'recoverableNoticePay',
        'recoverable_notice_pay',
        'noticePay',
        'notice_pay',
      ]),
      leaveWithoutPay: this.pickString([recoverableSource, item], ['leaveWithoutPay', 'leave_without_pay']),
      assetsHandledOver: this.pickString([recoverableSource, item], ['assetsHandledOver', 'assets_handled_over']),
      assetRecovered: this.pickString([recoverableSource, item], ['assetRecovered', 'asset_recovered']),
      assetRecoveryName: this.pickString([recoverableSource, item], ['assetRecoveryName', 'asset_recovery_name']),
      otherRecoverableAmounts: this.pickString([recoverableSource, item], [
        'otherRecoverableAmounts',
        'other_recoverable_amounts',
      ]),
      sss: this.pickString([recoverableSource, item], ['sss', 'SSS']),
    };

    const totalDuesPayable = this.pickNumber([duesSource, detailSource, item], [
      'totalDuesPayable',
      'total_dues_payable',
    ]);
    const totalRecoverableAmount = this.pickNumber([recoverableSource, detailSource, item], [
      'totalRecoverableAmount',
      'total_recoverable_amount',
    ]);

    const hasDetail =
      Object.values(duesPayable).some((value) => value) ||
      Object.values(recoverableAmount).some((value) => value) ||
      totalDuesPayable > 0 ||
      totalRecoverableAmount > 0;

    const employeeId = this.pickNumber(sources, ['employeeId', 'employee_id', 'EmployeeId', 'EmployeeID']);
    const yearOfService = this.pickNumber(sources, ['yearOfService', 'year_of_service', 'YearOfService']);

    const record: TerminationRecord = {
      Id: Number.parseInt(id, 10) || 0,
      EmployeeId: employeeId,
      EmployeeName: this.pickString(sources, ['employeeName', 'employee_name', 'EmployeeName']) || '—',
      Department: this.pickString(sources, ['department', 'Department']) || '—',
      EmployeeCategory: this.pickString(sources, ['employeeCategory', 'employee_category', 'EmployeeCategory']) || '—',
      Designation: this.pickString(sources, ['designation', 'Designation']) || '—',
      BranchLocation:
        this.pickString(sources, ['branchLocation', 'branch_location', 'BranchLocation', 'location', 'Location']) ||
        '—',
      CostCenter: this.pickString(sources, ['costCenter', 'cost_center', 'CostCenter']) || '—',
      WorkGradeLevel:
        this.pickString(sources, ['workGradeLevel', 'work_grade_level', 'WorkGradeLevel']) || '—',
      LastWorkingDay: this.pickString(sources, ['lastWorkingDay', 'last_working_day', 'LastWorkingDay']) || '—',
      YearOfService: yearOfService,
      ReleasingDate: this.pickString(sources, ['releasingDate', 'releasing_date', 'ReleasingDate']) || '—',
      GrossMonthlySalary:
        this.pickString(sources, ['grossMonthlySalary', 'gross_monthly_salary', 'GrossMonthlySalary']) || '—',
      CommitteeMeetingHeld:
        this.pickString(sources, ['committeeMeetingHeld', 'committee_meeting_held', 'CommitteeMeetingHeld']) || '—',
      selected: false,
    };

    if (hasDetail) {
      record.detail = {
        remarks: this.pickString([detailSource, item], ['remarks', 'Remarks']),
        duesPayable,
        recoverableAmount,
        totalDuesPayable,
        totalRecoverableAmount,
      };
    }

    return record;
  }
}
