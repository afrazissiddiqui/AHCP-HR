import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface PerformanceIncrementPayload {
  current_salary: number;
  increment_percentage: number;
  increment_effective_date: string;
  reason_for_increment: string;
  increment_amount: number;
  revised_salary: number;
}

export interface PerformancePromotionPayload {
  promotion_recommended: string;
  new_designation: string;
  promotion_effective_date: string;
  remarks: string;
}

export interface PerformanceOtherBenefitsPayload {
  existing_benefits_details: string;
  new_benefits: string;
}

export interface PerformanceAppraisalAddPayload {
  form_number: string;
  employee_id: string;
  employee_name: string;
  employee_category: string;
  work_grade_level: string;
  employment_nature: string;
  department: string;
  designation: string;
  date_of_joining: string;
  employment_type: string;
  job_title: string;
  reporting_manager: string;
  appraisal_authority: string;
  appraisal_period: string;
  current_salary: number;
  evaluation_date: string;
  increment: PerformanceIncrementPayload;
  promotion: PerformancePromotionPayload;
  other_benefits: PerformanceOtherBenefitsPayload;
}

export type PerformanceAppraisalSubmitBody = PerformanceAppraisalAddPayload;

export interface PerformanceAppraisalRecord {
  Id: number;
  FormNumber: string;
  EmployeeId: string;
  EmployeeName: string;
  EmployeeCategory: string;
  WorkGradeLevel: string;
  EmploymentNature: string;
  Department: string;
  Designation: string;
  DateOfJoining: string;
  EmploymentType: string;
  JobTitle: string;
  ReportingManager: string;
  AppraisalAuthority: string;
  AppraisalPeriod: string;
  CurrentSalary: number;
  EvaluationDate: string;
  Increment: PerformanceIncrementPayload;
  Promotion: PerformancePromotionPayload;
  OtherBenefits: PerformanceOtherBenefitsPayload;
  selected?: boolean;
}

const PERFORMANCE_APPRAISAL_LIST_URL = apiUrl('performance-appraisal-list');
const PERFORMANCE_APPRAISAL_ADD_URL = apiUrl('performance-appraisal-add');
const PERFORMANCE_APPRAISAL_UPDATE_URL = apiUrl('performance-appraisal-update');
const PERFORMANCE_APPRAISAL_DETAIL_URL = apiUrl('performance-appraisal-detail');
const PERFORMANCE_APPRAISAL_DELETE_URL = apiUrl('performance-appraisal-delete');

function toAmount(value: string | number | null | undefined): number {
  const numeric = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(numeric) ? numeric : 0;
}

export function buildPerformanceAppraisalSubmitPayload(
  draft: PerformanceAppraisalAddPayload,
): PerformanceAppraisalSubmitBody {
  const currentSalary = Math.round(draft.current_salary);
  const incrementAmount = Math.round(draft.increment.increment_amount);
  const incrementPercentage = Number(draft.increment.increment_percentage.toFixed(2));
  const revised =
    draft.increment.revised_salary > 0
      ? Math.round(draft.increment.revised_salary)
      : currentSalary + incrementAmount;

  return {
    form_number: draft.form_number.trim(),
    employee_id: draft.employee_id.trim(),
    employee_name: draft.employee_name.trim(),
    employee_category: draft.employee_category.trim(),
    work_grade_level: draft.work_grade_level.trim(),
    employment_nature: draft.employment_nature.trim(),
    department: draft.department.trim(),
    designation: draft.designation.trim(),
    date_of_joining: draft.date_of_joining.trim(),
    employment_type: draft.employment_type.trim(),
    job_title: draft.job_title.trim(),
    reporting_manager: draft.reporting_manager.trim(),
    appraisal_authority: draft.appraisal_authority.trim(),
    appraisal_period: draft.appraisal_period.trim(),
    current_salary: currentSalary,
    evaluation_date: draft.evaluation_date.trim(),
    increment: {
      current_salary: Math.round(draft.increment.current_salary) || currentSalary,
      increment_percentage: incrementPercentage,
      increment_effective_date: draft.increment.increment_effective_date.trim(),
      reason_for_increment: draft.increment.reason_for_increment.trim(),
      increment_amount: incrementAmount,
      revised_salary: revised,
    },
    promotion: {
      promotion_recommended: draft.promotion.promotion_recommended === 'Yes' ? 'Yes' : 'No',
      new_designation: draft.promotion.new_designation.trim(),
      promotion_effective_date: draft.promotion.promotion_effective_date.trim(),
      remarks: draft.promotion.remarks.trim(),
    },
    other_benefits: {
      existing_benefits_details: draft.other_benefits.existing_benefits_details.trim(),
      new_benefits: draft.other_benefits.new_benefits.trim(),
    },
  };
}

export function buildPerformanceAppraisalDraftFromForm(input: {
  formNumber: string;
  employeeId: string;
  employeeName: string;
  employeeCategory: string;
  workGradeLevel: string;
  employmentNature: string;
  department: string;
  designation: string;
  dateOfJoining: string;
  employmentType: string;
  jobTitle: string;
  reportingManager: string;
  appraisalAuthority: string;
  appraisalPeriod: string;
  currentSalary: string;
  evaluationDate: string;
  incrementPercentage: string;
  incrementEffectiveDate: string;
  reasonForIncrement: string;
  incrementAmount: string;
  revisedSalary: string;
  promotionRecommended: string;
  newDesignation: string;
  promotionEffectiveDate: string;
  promotionRemarks: string;
  existingBenefitsDetails: string;
  newBenefits: string;
}): PerformanceAppraisalAddPayload {
  const current = toAmount(input.currentSalary);
  const incrementAmount = toAmount(input.incrementAmount);
  const incrementPercentage = toAmount(input.incrementPercentage);
  const revisedFromField = toAmount(input.revisedSalary);
  const revised =
    revisedFromField > 0
      ? revisedFromField
      : current + (incrementAmount > 0 ? incrementAmount : (current * incrementPercentage) / 100);

  return {
    form_number: input.formNumber,
    employee_id: input.employeeId,
    employee_name: input.employeeName,
    employee_category: input.employeeCategory,
    work_grade_level: input.workGradeLevel,
    employment_nature: input.employmentNature,
    department: input.department,
    designation: input.designation,
    date_of_joining: input.dateOfJoining,
    employment_type: input.employmentType,
    job_title: input.jobTitle,
    reporting_manager: input.reportingManager,
    appraisal_authority: input.appraisalAuthority,
    appraisal_period: input.appraisalPeriod,
    current_salary: current,
    evaluation_date: input.evaluationDate,
    increment: {
      current_salary: current,
      increment_percentage: incrementPercentage,
      increment_effective_date: input.incrementEffectiveDate,
      reason_for_increment: input.reasonForIncrement,
      increment_amount: incrementAmount,
      revised_salary: revised,
    },
    promotion: {
      promotion_recommended: input.promotionRecommended,
      new_designation: input.newDesignation,
      promotion_effective_date: input.promotionEffectiveDate,
      remarks: input.promotionRemarks,
    },
    other_benefits: {
      existing_benefits_details: input.existingBenefitsDetails,
      new_benefits: input.newBenefits,
    },
  };
}

@Injectable({
  providedIn: 'root',
})
export class PerformanceAppraisalService {
  private readonly http = inject(HttpClient);
  private readonly appraisalList = signal<PerformanceAppraisalRecord[]>([]);

  readonly appraisals = this.appraisalList.asReadonly();

  fetchPerformanceAppraisals(): Observable<PerformanceAppraisalRecord[]> {
    return this.http.get<unknown>(PERFORMANCE_APPRAISAL_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => this.appraisalList.set(records)),
    );
  }

  addPerformanceAppraisal(payload: PerformanceAppraisalSubmitBody): Observable<unknown> {
    return this.http.post(
      PERFORMANCE_APPRAISAL_ADD_URL,
      buildPerformanceAppraisalSubmitPayload(payload),
    );
  }

  updatePerformanceAppraisal(id: string | number, payload: PerformanceAppraisalSubmitBody): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post(
      `${PERFORMANCE_APPRAISAL_UPDATE_URL}/${identifier}`,
      buildPerformanceAppraisalSubmitPayload(payload),
    );
  }

  fetchPerformanceAppraisalDetail(id: string | number): Observable<PerformanceAppraisalRecord> {
    const identifier = encodeURIComponent(String(id));
    const numericId = Number.parseInt(String(id), 10) || 0;

    return this.http.get<unknown>(`${PERFORMANCE_APPRAISAL_DETAIL_URL}/${identifier}`).pipe(
      map((response) => {
        const record = this.mapDetailResponse(response);
        if (!record.Id && numericId) {
          return { ...record, Id: numericId };
        }
        return record;
      }),
    );
  }

  deletePerformanceAppraisal(id: string | number): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete(`${PERFORMANCE_APPRAISAL_DELETE_URL}/${identifier}`);
  }

  removeAppraisalRecord(record: PerformanceAppraisalRecord): void {
    this.appraisalList.update((list) => list.filter((item) => item.Id !== record.Id));
  }

  findAppraisalById(id: string | number): PerformanceAppraisalRecord | undefined {
    const numericId = Number.parseInt(String(id), 10);
    return this.appraisalList().find((item) => item.Id === numericId);
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
      'performance_appraisals',
      'performance_appraisal_list',
      'performanceAppraisalList',
      'performanceAppraisals',
      'performance_appraisal',
      'performanceAppraisal',
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

    if (obj['form_number'] || obj['formNumber'] || obj['employee_id'] || obj['employeeId']) {
      return [obj];
    }

    return [];
  }

  private mapDetailResponse(response: unknown): PerformanceAppraisalRecord {
    const items = this.extractApiItems(response);
    if (items.length > 0) {
      return this.mapApiItemToRecord(items[0]);
    }

    if (response && typeof response === 'object') {
      return this.mapApiItemToRecord(response as Record<string, unknown>);
    }

    throw new Error('Performance appraisal record not found');
  }

  private mapApiItemToRecord(item: Record<string, unknown>): PerformanceAppraisalRecord {
    const asString = (value: unknown): string =>
      value === undefined || value === null ? '' : String(value).trim();
    const asNumber = (value: unknown, fallback = 0): number => {
      const parsed = Number.parseFloat(asString(value));
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const id =
      asString(item['id']) ||
      asString(item['Id']) ||
      asString(item['performance_appraisal_id']);

    const incrementSource =
      (item['increment'] as Record<string, unknown> | undefined) ?? {};

    const promotionSource =
      (item['promotion'] as Record<string, unknown> | undefined) ?? {};

    const benefitsSource =
      (item['other_benefits'] as Record<string, unknown> | undefined) ??
      (item['otherBenefits'] as Record<string, unknown> | undefined) ??
      {};

    const currentSalary = asNumber(item['current_salary'] ?? item['currentSalary']);

    const increment: PerformanceIncrementPayload = {
      current_salary: asNumber(
        incrementSource['current_salary'] ?? incrementSource['currentSalary'],
        currentSalary,
      ),
      increment_percentage: asNumber(
        incrementSource['increment_percentage'] ?? incrementSource['incrementPercentage'],
      ),
      increment_effective_date:
        asString(incrementSource['increment_effective_date']) ||
        asString(incrementSource['incrementEffectiveDate']),
      reason_for_increment:
        asString(incrementSource['reason_for_increment']) ||
        asString(incrementSource['reasonForIncrement']),
      increment_amount: asNumber(
        incrementSource['increment_amount'] ?? incrementSource['incrementAmount'],
      ),
      revised_salary: asNumber(incrementSource['revised_salary'] ?? incrementSource['revisedSalary']),
    };

    const promotion: PerformancePromotionPayload = {
      promotion_recommended:
        asString(promotionSource['promotion_recommended']) ||
        asString(promotionSource['promotionRecommended']) ||
        'No',
      new_designation:
        asString(promotionSource['new_designation']) || asString(promotionSource['newDesignation']),
      promotion_effective_date:
        asString(promotionSource['promotion_effective_date']) ||
        asString(promotionSource['promotionEffectiveDate']),
      remarks: asString(promotionSource['remarks']),
    };

    const otherBenefits: PerformanceOtherBenefitsPayload = {
      existing_benefits_details:
        asString(benefitsSource['existing_benefits_details']) ||
        asString(benefitsSource['existingBenefitsDetails']),
      new_benefits:
        asString(benefitsSource['new_benefits']) || asString(benefitsSource['newBenefits']),
    };

    return {
      Id: Number.parseInt(id, 10) || 0,
      FormNumber: asString(item['form_number']) || asString(item['formNumber']) || '—',
      EmployeeId: asString(item['employee_id']) || asString(item['employeeId']) || '—',
      EmployeeName: asString(item['employee_name']) || asString(item['employeeName']) || '—',
      EmployeeCategory:
        asString(item['employee_category']) || asString(item['employeeCategory']) || '—',
      WorkGradeLevel:
        asString(item['work_grade_level']) || asString(item['workGradeLevel']) || '—',
      EmploymentNature:
        asString(item['employment_nature']) || asString(item['employmentNature']) || '—',
      Department: asString(item['department']) || '—',
      Designation: asString(item['designation']) || '—',
      DateOfJoining: asString(item['date_of_joining']) || asString(item['dateOfJoining']) || '—',
      EmploymentType: asString(item['employment_type']) || asString(item['employmentType']) || '—',
      JobTitle: asString(item['job_title']) || asString(item['jobTitle']) || '—',
      ReportingManager:
        asString(item['reporting_manager']) || asString(item['reportingManager']) || '—',
      AppraisalAuthority:
        asString(item['appraisal_authority']) || asString(item['appraisalAuthority']) || '—',
      AppraisalPeriod:
        asString(item['appraisal_period']) || asString(item['appraisalPeriod']) || '—',
      CurrentSalary: currentSalary,
      EvaluationDate: asString(item['evaluation_date']) || asString(item['evaluationDate']) || '—',
      Increment: increment,
      Promotion: promotion,
      OtherBenefits: otherBenefits,
      selected: false,
    };
  }
}
