import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

export interface ProbationRatingItem {
  rating: number;
  remarks: string;
}

export interface ProbationEvaluationAddPayload {
  employee_code: string;
  employee_name: string;
  department: string;
  location: string;
  designation: string;
  reporting_manager: string;
  employee_nature: string;
  employee_type: string;
  grade_work_level: string;
  employment_category: string;
  probation_start_date: string;
  probation_end_date: string;
  remarks: string;
  probation_rating: {
    communication_skills: ProbationRatingItem;
    technical_skills: ProbationRatingItem;
    attendance: ProbationRatingItem;
    discipline: ProbationRatingItem;
    teamwork: ProbationRatingItem;
    productivity: ProbationRatingItem;
  };
  supervision_remark: string;
  extension_of_probation: {
    probation_start_date: string;
    probation_end_date: string;
    is_extension_enabled: boolean;
    extension_period_in_probation: string;
    new_probation_end_date: string;
  };
  termination_of_probation: {
    termination: string;
    termination_effective_date: string | null;
  };
  salary_adjustment: {
    currentSalary: number;
    adjustmentInSalary: number;
    adjustmentAmountInSalary: number;
    effectiveDateOfRevision: string;
  };
  allowances: Array<{ allowance: string; amount: number; notes: string }>;
  total_salary: number;
}

export interface ProbationEvaluationRecord {
  Id: number;
  EmployeeCode: string;
  EmployeeName: string;
  Department: string;
  Location: string;
  Designation: string;
  ReportingManager: string;
  EmployeeNature: string;
  EmployeeType: string;
  GradeWorkLevel: string;
  EmploymentCategory: string;
  ProbationStartDate: string;
  ProbationEndDate: string;
  Remarks: string;
  ProbationRating: ProbationEvaluationAddPayload['probation_rating'];
  SupervisionRemark: string;
  ExtensionOfProbation: ProbationEvaluationAddPayload['extension_of_probation'];
  TerminationOfProbation: ProbationEvaluationAddPayload['termination_of_probation'];
  SalaryAdjustment: ProbationEvaluationAddPayload['salary_adjustment'];
  Allowances: ProbationEvaluationAddPayload['allowances'];
  TotalSalary: number;
  selected?: boolean;
}

const PROBATION_EVALUATION_LIST_URL = 'http://ahcp.hr:8080/api/probation-evaluation-list';
const PROBATION_EVALUATION_ADD_URL = 'http://ahcp.hr:8080/api/probation-evaluation-add';
const PROBATION_EVALUATION_UPDATE_URL = 'http://ahcp.hr:8080/api/probation-evaluation-update';
const PROBATION_EVALUATION_DELETE_URL = 'http://ahcp.hr:8080/api/probation-evaluation-delete';

@Injectable({
  providedIn: 'root',
})
export class ProbationEvaluationService {
  private readonly http = inject(HttpClient);
  private readonly probationList = signal<ProbationEvaluationRecord[]>([]);

  readonly probations = this.probationList.asReadonly();

  fetchProbationEvaluations(): Observable<ProbationEvaluationRecord[]> {
    return this.http.get<unknown>(PROBATION_EVALUATION_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => this.probationList.set(records)),
    );
  }

  addProbationEvaluation(payload: ProbationEvaluationAddPayload): Observable<unknown> {
    return this.http.post(PROBATION_EVALUATION_ADD_URL, payload);
  }

  updateProbationEvaluation(id: string | number, payload: ProbationEvaluationAddPayload): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post(`${PROBATION_EVALUATION_UPDATE_URL}/${identifier}`, payload);
  }

  deleteProbationEvaluation(id: string | number): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete(`${PROBATION_EVALUATION_DELETE_URL}/${identifier}`);
  }

  findProbationById(id: string | number): ProbationEvaluationRecord | undefined {
    const numericId = Number.parseInt(String(id), 10);
    return this.probationList().find((item) => item.Id === numericId);
  }

  removeProbationRecord(record: ProbationEvaluationRecord): void {
    this.probationList.update((list) => list.filter((item) => item.Id !== record.Id));
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
      'probationEvaluations',
      'probation_evaluations',
      'probation_evaluation_list',
      'probationEvaluationList',
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

    if (obj['employee_code'] || obj['employeeCode'] || obj['employee_name'] || obj['employeeName']) {
      return [obj];
    }

    return [];
  }

  private mapApiItemToRecord(item: Record<string, unknown>): ProbationEvaluationRecord {
    const asString = (value: unknown): string =>
      value === undefined || value === null ? '' : String(value).trim();
    const asNumber = (value: unknown, fallback = 0): number => {
      const parsed = Number.parseFloat(asString(value));
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const asNullableDate = (value: unknown): string | null => {
      const text = asString(value);
      return text ? text : null;
    };

    const id = asString(item['id']) || asString(item['Id']) || asString(item['probation_evaluation_id']);

    const ratingSource =
      (item['probation_rating'] as Record<string, unknown> | undefined) ??
      (item['probationRating'] as Record<string, unknown> | undefined) ??
      {};

    const mapRatingItem = (keys: string[]): ProbationRatingItem => {
      for (const key of keys) {
        const entry = ratingSource[key];
        if (entry && typeof entry === 'object') {
          const ratingObj = entry as Record<string, unknown>;
          return {
            rating: asNumber(ratingObj['rating']),
            remarks: asString(ratingObj['remarks']),
          };
        }
      }
      return { rating: 0, remarks: '' };
    };

    const extensionSource =
      (item['extension_of_probation'] as Record<string, unknown> | undefined) ??
      (item['extensionOfProbation'] as Record<string, unknown> | undefined) ??
      {};

    const terminationSource =
      (item['termination_of_probation'] as Record<string, unknown> | undefined) ??
      (item['terminationOfProbation'] as Record<string, unknown> | undefined) ??
      {};

    const salarySource =
      (item['salary_adjustment'] as Record<string, unknown> | undefined) ??
      (item['salaryAdjustment'] as Record<string, unknown> | undefined) ??
      {};

    const allowancesRaw = item['allowances'];
    const allowances: ProbationEvaluationAddPayload['allowances'] = Array.isArray(allowancesRaw)
      ? allowancesRaw
          .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
          .map((entry) => ({
            allowance: asString(entry['allowance']),
            amount: asNumber(entry['amount']),
            notes: asString(entry['notes']),
          }))
      : [];

    return {
      Id: Number.parseInt(id, 10) || 0,
      EmployeeCode: asString(item['employee_code']) || asString(item['employeeCode']) || '—',
      EmployeeName: asString(item['employee_name']) || asString(item['employeeName']) || '—',
      Department: asString(item['department']) || '—',
      Location: asString(item['location']) || '—',
      Designation: asString(item['designation']) || '—',
      ReportingManager: asString(item['reporting_manager']) || asString(item['reportingManager']) || '—',
      EmployeeNature: asString(item['employee_nature']) || asString(item['employeeNature']) || '—',
      EmployeeType: asString(item['employee_type']) || asString(item['employeeType']) || '—',
      GradeWorkLevel: asString(item['grade_work_level']) || asString(item['gradeWorkLevel']) || '—',
      EmploymentCategory: asString(item['employment_category']) || asString(item['employmentCategory']) || '—',
      ProbationStartDate:
        asString(item['probation_start_date']) || asString(item['probationStartDate']) || '—',
      ProbationEndDate: asString(item['probation_end_date']) || asString(item['probationEndDate']) || '—',
      Remarks: asString(item['remarks']) || '—',
      ProbationRating: {
        communication_skills: mapRatingItem(['communication_skills', 'communicationSkills']),
        technical_skills: mapRatingItem(['technical_skills', 'technicalSkills']),
        attendance: mapRatingItem(['attendance']),
        discipline: mapRatingItem(['discipline']),
        teamwork: mapRatingItem(['teamwork']),
        productivity: mapRatingItem(['productivity']),
      },
      SupervisionRemark: asString(item['supervision_remark']) || asString(item['supervisionRemark']) || '—',
      ExtensionOfProbation: {
        probation_start_date:
          asString(extensionSource['probation_start_date']) || asString(extensionSource['probationStartDate']),
        probation_end_date:
          asString(extensionSource['probation_end_date']) || asString(extensionSource['probationEndDate']),
        is_extension_enabled: Boolean(
          extensionSource['is_extension_enabled'] ?? extensionSource['isExtensionEnabled'] ?? false,
        ),
        extension_period_in_probation:
          asString(extensionSource['extension_period_in_probation']) ||
          asString(extensionSource['extensionPeriodInProbation']),
        new_probation_end_date:
          asString(extensionSource['new_probation_end_date']) || asString(extensionSource['newProbationEndDate']),
      },
      TerminationOfProbation: {
        termination: asString(terminationSource['termination']) || 'No',
        termination_effective_date: asNullableDate(
          terminationSource['termination_effective_date'] ?? terminationSource['terminationEffectiveDate'],
        ),
      },
      SalaryAdjustment: {
        currentSalary: asNumber(salarySource['currentSalary'] ?? salarySource['current_salary']),
        adjustmentInSalary: asNumber(salarySource['adjustmentInSalary'] ?? salarySource['adjustment_in_salary']),
        adjustmentAmountInSalary: asNumber(
          salarySource['adjustmentAmountInSalary'] ?? salarySource['adjustment_amount_in_salary'],
        ),
        effectiveDateOfRevision:
          asString(salarySource['effectiveDateOfRevision']) || asString(salarySource['effective_date_of_revision']),
      },
      Allowances: allowances,
      TotalSalary: asNumber(item['total_salary'] ?? item['totalSalary']),
      selected: false,
    };
  }
}
