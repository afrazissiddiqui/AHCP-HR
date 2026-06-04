import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface ExpenseHeaderFieldsPayload {
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  costCenter: string;
  claimMonth: string;
  formNumber: string;
  submissionDate: string;
}

export interface ExpenseDetailPayload {
  formNumber: string;
  employeeID: string;
  employeeName: string;
  department: string;
  expenseType: string;
  claimAmount: string;
  claimDate: string;
  approvalStatus: string;
  remarks: string;
}

export interface ExpenseTravelPayload {
  travelFromDate: string;
  travelToDate: string;
  dailyAllowanceApplicable: string;
  dailyAllowanceRate: string;
  numberOfDays: string;
  dailyAllowanceAmount: string;
  remarks: string;
}

export interface ExpenseReimbursementAddPayload {
  headerFields: ExpenseHeaderFieldsPayload;
  expenseDetail: ExpenseDetailPayload;
  travel: ExpenseTravelPayload;
}

export type ExpenseReimbursementSubmitBody = ExpenseReimbursementAddPayload;

export interface ExpenseReimbursementRecord {
  Id: number;
  /** headerFields.formNumber / expenseDetail.formNumber */
  FormNumber: string;
  /** headerFields.employeeCode */
  EmployeeCode: string;
  /** expenseDetail.employeeID */
  EmployeeId: string;
  /** expenseDetail.employeeName / headerFields.employeeName */
  EmployeeName: string;
  /** expenseDetail.department / headerFields.department */
  Department: string;
  /** headerFields.designation */
  Designation: string;
  /** headerFields.costCenter */
  CostCenter: string;
  /** headerFields.claimMonth */
  ClaimMonth: string;
  /** headerFields.submissionDate */
  SubmissionDate: string;
  /** expenseDetail.expenseType */
  ExpenseType: string;
  /** expenseDetail.claimAmount */
  ClaimAmount: string;
  /** expenseDetail.claimDate */
  ClaimDate: string;
  /** expenseDetail.approvalStatus */
  ApprovalStatus: string;
  /** travel.travelFromDate */
  TravelFromDate: string;
  /** travel.travelToDate */
  TravelToDate: string;
  /** travel.dailyAllowanceApplicable */
  DailyAllowanceApplicable: string;
  /** travel.dailyAllowanceRate */
  DailyAllowanceRate: string;
  /** travel.numberOfDays */
  NumberOfDays: string;
  /** travel.dailyAllowanceAmount */
  DailyAllowanceAmount: string;
  HeaderFields: ExpenseHeaderFieldsPayload;
  ExpenseDetail: ExpenseDetailPayload;
  Travel: ExpenseTravelPayload;
  selected?: boolean;
}

const EXPENSE_REIMBURSEMENT_LIST_URL = apiUrl('expense-reimbursement-list');
const EXPENSE_REIMBURSEMENT_ADD_URL = apiUrl('expense-reimbursement-add');
const EXPENSE_REIMBURSEMENT_UPDATE_URL = apiUrl('expense-reimbursement-update');
const EXPENSE_REIMBURSEMENT_DETAIL_URL = apiUrl('expense-reimbursement-detail');
const EXPENSE_REIMBURSEMENT_DELETE_URL = apiUrl('expense-reimbursement-delete');

export function buildExpenseReimbursementSubmitPayload(
  draft: ExpenseReimbursementAddPayload,
): ExpenseReimbursementSubmitBody {
  const formNumber =
    draft.headerFields.formNumber.trim() || draft.expenseDetail.formNumber.trim();

  const employeeCode = draft.headerFields.employeeCode.trim();
  const employeeId = draft.expenseDetail.employeeID.trim() || employeeCode;
  const employeeName =
    draft.headerFields.employeeName.trim() || draft.expenseDetail.employeeName.trim();
  const department =
    draft.headerFields.department.trim() || draft.expenseDetail.department.trim();

  const dailyApplicable = draft.travel.dailyAllowanceApplicable === 'Yes' ? 'Yes' : 'No';

  return {
    headerFields: {
      employeeCode,
      employeeName,
      department,
      designation: draft.headerFields.designation.trim(),
      costCenter: draft.headerFields.costCenter.trim(),
      claimMonth: draft.headerFields.claimMonth.trim(),
      formNumber,
      submissionDate: draft.headerFields.submissionDate.trim(),
    },
    expenseDetail: {
      formNumber,
      employeeID: employeeId,
      employeeName,
      department,
      expenseType: draft.expenseDetail.expenseType.trim(),
      claimAmount: draft.expenseDetail.claimAmount.trim(),
      claimDate: draft.expenseDetail.claimDate.trim(),
      approvalStatus: draft.expenseDetail.approvalStatus.trim() || 'Pending',
      remarks: draft.expenseDetail.remarks.trim(),
    },
    travel: {
      travelFromDate: draft.travel.travelFromDate.trim(),
      travelToDate: draft.travel.travelToDate.trim(),
      dailyAllowanceApplicable: dailyApplicable,
      dailyAllowanceRate: dailyApplicable === 'Yes' ? draft.travel.dailyAllowanceRate.trim() : '',
      numberOfDays: dailyApplicable === 'Yes' ? draft.travel.numberOfDays.trim() : '',
      dailyAllowanceAmount: dailyApplicable === 'Yes' ? draft.travel.dailyAllowanceAmount.trim() : '',
      remarks: draft.travel.remarks.trim(),
    },
  };
}

export function buildExpenseReimbursementDraftFromForm(input: {
  employeeCode: string;
  headerEmployeeName: string;
  headerDepartment: string;
  designation: string;
  costCenter: string;
  claimMonth: string;
  formNumber: string;
  submissionDate: string;
  employeeId: string;
  detailEmployeeName: string;
  detailDepartment: string;
  expenseType: string;
  claimAmount: string;
  claimDate: string;
  approvalStatus: string;
  expenseRemarks: string;
  travelFromDate: string;
  travelToDate: string;
  dailyAllowanceApplicable: string;
  dailyAllowanceRate: string;
  numberOfDays: string;
  dailyAllowanceAmount: string;
  travelRemarks: string;
}): ExpenseReimbursementAddPayload {
  const formNumber = input.formNumber.trim();

  return {
    headerFields: {
      employeeCode: input.employeeCode,
      employeeName: input.headerEmployeeName,
      department: input.headerDepartment,
      designation: input.designation,
      costCenter: input.costCenter,
      claimMonth: input.claimMonth,
      formNumber,
      submissionDate: input.submissionDate,
    },
    expenseDetail: {
      formNumber,
      employeeID: input.employeeId || input.employeeCode,
      employeeName: input.detailEmployeeName || input.headerEmployeeName,
      department: input.detailDepartment || input.headerDepartment,
      expenseType: input.expenseType,
      claimAmount: input.claimAmount,
      claimDate: input.claimDate,
      approvalStatus: input.approvalStatus,
      remarks: input.expenseRemarks,
    },
    travel: {
      travelFromDate: input.travelFromDate,
      travelToDate: input.travelToDate,
      dailyAllowanceApplicable: input.dailyAllowanceApplicable,
      dailyAllowanceRate: input.dailyAllowanceRate,
      numberOfDays: input.numberOfDays,
      dailyAllowanceAmount: input.dailyAllowanceAmount,
      remarks: input.travelRemarks,
    },
  };
}

@Injectable({
  providedIn: 'root',
})
export class ExpenseReimbursementService {
  private readonly http = inject(HttpClient);
  private readonly expenseList = signal<ExpenseReimbursementRecord[]>([]);

  readonly expenses = this.expenseList.asReadonly();

  fetchExpenseReimbursements(): Observable<ExpenseReimbursementRecord[]> {
    return this.http.get<unknown>(EXPENSE_REIMBURSEMENT_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => this.expenseList.set(records)),
    );
  }

  addExpenseReimbursement(payload: ExpenseReimbursementSubmitBody): Observable<unknown> {
    return this.http.post(
      EXPENSE_REIMBURSEMENT_ADD_URL,
      buildExpenseReimbursementSubmitPayload(payload),
    );
  }

  updateExpenseReimbursement(id: string | number, payload: ExpenseReimbursementSubmitBody): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post(
      `${EXPENSE_REIMBURSEMENT_UPDATE_URL}/${identifier}`,
      buildExpenseReimbursementSubmitPayload(payload),
    );
  }

  fetchExpenseReimbursementDetail(id: string | number): Observable<ExpenseReimbursementRecord> {
    const identifier = encodeURIComponent(String(id));
    const numericId = Number.parseInt(String(id), 10) || 0;

    return this.http.get<unknown>(`${EXPENSE_REIMBURSEMENT_DETAIL_URL}/${identifier}`).pipe(
      map((response) => {
        const record = this.mapDetailResponse(response);
        if (!record.Id && numericId) {
          return { ...record, Id: numericId };
        }
        return record;
      }),
    );
  }

  deleteExpenseReimbursement(id: string | number): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete(`${EXPENSE_REIMBURSEMENT_DELETE_URL}/${identifier}`);
  }

  removeExpenseRecord(record: ExpenseReimbursementRecord): void {
    this.expenseList.update((list) => list.filter((item) => item.Id !== record.Id));
  }

  findExpenseById(id: string | number): ExpenseReimbursementRecord | undefined {
    const numericId = Number.parseInt(String(id), 10);
    return this.expenseList().find((item) => item.Id === numericId);
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
      'expense_reimbursements',
      'expense_reimbursement_list',
      'expenseReimbursementList',
      'expenseReimbursements',
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
      obj['headerFields'] ||
      obj['header_fields'] ||
      obj['HeaderFields'] ||
      obj['expenseDetail'] ||
      obj['expense_detail'] ||
      obj['ExpenseDetail'] ||
      obj['formNumber'] ||
      obj['form_number'] ||
      obj['FormNumber'] ||
      obj['employee_code'] ||
      obj['employeeCode'] ||
      obj['expense_type'] ||
      obj['expenseType'] ||
      obj['ExpenseType']
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

  private mapDetailResponse(response: unknown): ExpenseReimbursementRecord {
    const items = this.extractApiItems(response);
    if (items.length > 0) {
      return this.mapApiItemToRecord(items[0]);
    }

    if (response && typeof response === 'object') {
      return this.mapApiItemToRecord(response as Record<string, unknown>);
    }

    throw new Error('Expense reimbursement record not found');
  }

  private mapApiItemToRecord(item: Record<string, unknown>): ExpenseReimbursementRecord {
    const asString = (value: unknown): string =>
      value === undefined || value === null ? '' : String(value).trim();

    const id = this.pickString([item], ['id', 'Id', 'expense_reimbursement_id']);

    const headerSource = this.asRecord(
      item['headerFields'] ?? item['header_fields'] ?? item['HeaderFields'],
    );
    const detailSource = this.asRecord(
      item['expenseDetail'] ??
        item['expense_detail'] ??
        item['ExpenseDetail'] ??
        item['expense_details'] ??
        item['expenseDetails'],
    );
    const travelSource = this.asRecord(item['travel'] ?? item['Travel']);

    const sources = [detailSource, headerSource, travelSource, item];

    const headerFields: ExpenseHeaderFieldsPayload = {
      employeeCode: this.pickString(sources, ['employeeCode', 'employee_code', 'EmployeeCode']),
      employeeName: this.pickString(sources, ['employeeName', 'employee_name', 'EmployeeName']),
      department: this.pickString(sources, ['department', 'Department']),
      designation: this.pickString(sources, ['designation', 'Designation']),
      costCenter: this.pickString(sources, ['costCenter', 'cost_center', 'CostCenter']),
      claimMonth: this.pickString(sources, ['claimMonth', 'claim_month', 'ClaimMonth']),
      formNumber: this.pickString(sources, ['formNumber', 'form_number', 'FormNumber']),
      submissionDate: this.pickString(sources, [
        'submissionDate',
        'submission_date',
        'SubmissionDate',
      ]),
    };

    const expenseDetail: ExpenseDetailPayload = {
      formNumber:
        this.pickString([detailSource, item], ['formNumber', 'form_number', 'FormNumber']) ||
        headerFields.formNumber,
      employeeID:
        this.pickString(sources, ['employeeID', 'employee_id', 'employeeId', 'EmployeeId']) ||
        headerFields.employeeCode,
      employeeName:
        this.pickString([detailSource, headerSource, item], [
          'employeeName',
          'employee_name',
          'EmployeeName',
        ]) || headerFields.employeeName,
      department:
        this.pickString([detailSource, headerSource, item], ['department', 'Department']) ||
        headerFields.department,
      expenseType: this.pickString(sources, ['expenseType', 'expense_type', 'ExpenseType']),
      claimAmount: this.pickString(sources, ['claimAmount', 'claim_amount', 'ClaimAmount']),
      claimDate: this.pickString(sources, ['claimDate', 'claim_date', 'ClaimDate']),
      approvalStatus:
        this.pickString(sources, ['approvalStatus', 'approval_status', 'ApprovalStatus']) ||
        'Pending',
      remarks: this.pickString(sources, ['remarks', 'Remarks']),
    };

    const travel: ExpenseTravelPayload = {
      travelFromDate: this.pickString(sources, [
        'travelFromDate',
        'travel_from_date',
        'TravelFromDate',
      ]),
      travelToDate: this.pickString(sources, ['travelToDate', 'travel_to_date', 'TravelToDate']),
      dailyAllowanceApplicable:
        this.pickString(sources, [
          'dailyAllowanceApplicable',
          'daily_allowance_applicable',
          'DailyAllowanceApplicable',
        ]) || 'No',
      dailyAllowanceRate: this.pickString(sources, [
        'dailyAllowanceRate',
        'daily_allowance_rate',
        'DailyAllowanceRate',
      ]),
      numberOfDays: this.pickString(sources, ['numberOfDays', 'number_of_days', 'NumberOfDays']),
      dailyAllowanceAmount: this.pickString(sources, [
        'dailyAllowanceAmount',
        'daily_allowance_amount',
        'DailyAllowanceAmount',
      ]),
      remarks: this.pickString([travelSource, item], ['remarks', 'Remarks']),
    };

    return {
      Id: Number.parseInt(id, 10) || 0,
      FormNumber: expenseDetail.formNumber || headerFields.formNumber || '—',
      EmployeeCode: headerFields.employeeCode || '—',
      EmployeeId: expenseDetail.employeeID || headerFields.employeeCode || '—',
      EmployeeName: expenseDetail.employeeName || headerFields.employeeName || '—',
      Department: expenseDetail.department || headerFields.department || '—',
      Designation: headerFields.designation || '—',
      CostCenter: headerFields.costCenter || '—',
      ClaimMonth: headerFields.claimMonth || '—',
      SubmissionDate: headerFields.submissionDate || '—',
      ExpenseType: expenseDetail.expenseType || '—',
      ClaimAmount: expenseDetail.claimAmount || '—',
      ClaimDate: expenseDetail.claimDate || '—',
      ApprovalStatus: expenseDetail.approvalStatus || '—',
      TravelFromDate: travel.travelFromDate || '—',
      TravelToDate: travel.travelToDate || '—',
      DailyAllowanceApplicable: travel.dailyAllowanceApplicable || '—',
      DailyAllowanceRate: travel.dailyAllowanceRate || '—',
      NumberOfDays: travel.numberOfDays || '—',
      DailyAllowanceAmount: travel.dailyAllowanceAmount || '—',
      HeaderFields: headerFields,
      ExpenseDetail: expenseDetail,
      Travel: travel,
      selected: false,
    };
  }
}
