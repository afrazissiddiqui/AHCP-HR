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
      obj['expenseDetail'] ||
      obj['expense_detail'] ||
      obj['formNumber'] ||
      obj['form_number']
    ) {
      return [obj];
    }

    return [];
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

    const id =
      asString(item['id']) ||
      asString(item['Id']) ||
      asString(item['expense_reimbursement_id']);

    const headerSource =
      (item['headerFields'] as Record<string, unknown> | undefined) ??
      (item['header_fields'] as Record<string, unknown> | undefined) ??
      {};

    const detailSource =
      (item['expenseDetail'] as Record<string, unknown> | undefined) ??
      (item['expense_detail'] as Record<string, unknown> | undefined) ??
      {};

    const travelSource =
      (item['travel'] as Record<string, unknown> | undefined) ?? {};

    const headerFields: ExpenseHeaderFieldsPayload = {
      employeeCode:
        asString(headerSource['employeeCode']) || asString(headerSource['employee_code']) || asString(item['employee_code']),
      employeeName:
        asString(headerSource['employeeName']) || asString(headerSource['employee_name']) || asString(item['employee_name']),
      department: asString(headerSource['department']) || asString(item['department']),
      designation: asString(headerSource['designation']) || asString(item['designation']),
      costCenter: asString(headerSource['costCenter']) || asString(headerSource['cost_center']),
      claimMonth: asString(headerSource['claimMonth']) || asString(headerSource['claim_month']),
      formNumber:
        asString(headerSource['formNumber']) ||
        asString(headerSource['form_number']) ||
        asString(detailSource['formNumber']) ||
        asString(detailSource['form_number']),
      submissionDate:
        asString(headerSource['submissionDate']) || asString(headerSource['submission_date']),
    };

    const expenseDetail: ExpenseDetailPayload = {
      formNumber:
        asString(detailSource['formNumber']) ||
        asString(detailSource['form_number']) ||
        headerFields.formNumber,
      employeeID:
        asString(detailSource['employeeID']) ||
        asString(detailSource['employee_id']) ||
        asString(detailSource['employeeId']) ||
        headerFields.employeeCode,
      employeeName:
        asString(detailSource['employeeName']) ||
        asString(detailSource['employee_name']) ||
        headerFields.employeeName,
      department: asString(detailSource['department']) || headerFields.department,
      expenseType: asString(detailSource['expenseType']) || asString(detailSource['expense_type']),
      claimAmount: asString(detailSource['claimAmount']) || asString(detailSource['claim_amount']),
      claimDate: asString(detailSource['claimDate']) || asString(detailSource['claim_date']),
      approvalStatus:
        asString(detailSource['approvalStatus']) ||
        asString(detailSource['approval_status']) ||
        'Pending',
      remarks: asString(detailSource['remarks']),
    };

    const travel: ExpenseTravelPayload = {
      travelFromDate:
        asString(travelSource['travelFromDate']) || asString(travelSource['travel_from_date']),
      travelToDate:
        asString(travelSource['travelToDate']) || asString(travelSource['travel_to_date']),
      dailyAllowanceApplicable:
        asString(travelSource['dailyAllowanceApplicable']) ||
        asString(travelSource['daily_allowance_applicable']) ||
        'No',
      dailyAllowanceRate:
        asString(travelSource['dailyAllowanceRate']) || asString(travelSource['daily_allowance_rate']),
      numberOfDays:
        asString(travelSource['numberOfDays']) || asString(travelSource['number_of_days']),
      dailyAllowanceAmount:
        asString(travelSource['dailyAllowanceAmount']) ||
        asString(travelSource['daily_allowance_amount']),
      remarks: asString(travelSource['remarks']),
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
