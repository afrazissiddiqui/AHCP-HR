import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface TrainingDetailPayload {
  training_title: string;
  training_category: string;
  training_type: string;
  training_stage: string;
  training_start_date: string;
  training_end_date: string;
  training_duration: string;
  trainer: string;
  training_objectives: string;
  skills_covered: string;
  remarks: string;
}

export interface TrainingEvaluationPayload {
  evaluation_cycle_number: string;
  evaluation_date: string;
  evaluation_period: string;
  evaluator_name: string;
  evaluation_parameter: string;
  parameter_rating: number;
  overall_score: string;
  performance_remarks: string;
}

export interface TrainingSalaryPayload {
  current_salary: number;
  increment_amount: number;
  increment_percentage: number;
  revised_salary: number;
  effective_date_of_revision: string;
  reason_for_increment: string;
  approval_authority: string;
}

export interface TrainingPromotionPayload {
  promotion_recommended: string;
  new_designation: string;
  promotion_effective_date: string;
  performance_eligibility_check: string;
  training_completion_verification: string;
  remarks: string;
}

export interface TrainingDevelopmentAddPayload {
  employee_code: string;
  employee_name: string;
  department: string;
  location: string;
  designation: string;
  job_title: string;
  reporting_manager: string;
  employee_nature: string;
  employee_type: string;
  grade_work_level: string;
  employment_category: string;
  date_of_joining: string;
  remarks: string;
  training_detail: TrainingDetailPayload;
  training_evaluation: TrainingEvaluationPayload;
  salary: TrainingSalaryPayload;
  promotion: TrainingPromotionPayload;
}

export type TrainingDevelopmentSubmitBody = TrainingDevelopmentAddPayload;

export interface TrainingDevelopmentRecord {
  Id: number;
  EmployeeCode: string;
  EmployeeName: string;
  Department: string;
  Location: string;
  Designation: string;
  JobTitle: string;
  ReportingManager: string;
  EmployeeNature: string;
  EmployeeType: string;
  GradeWorkLevel: string;
  EmploymentCategory: string;
  DateOfJoining: string;
  Remarks: string;
  TrainingDetail: TrainingDetailPayload;
  TrainingEvaluation: TrainingEvaluationPayload;
  Salary: TrainingSalaryPayload;
  Promotion: TrainingPromotionPayload;
  /** Alias for list/filter (same as EmployeeNature). */
  EmploymentNature: string;
  TrainingTitle: string;
  TrainingCategory: string;
  TrainingStage: string;
  TrainingStartDate: string;
  TrainingEndDate: string;
  selected?: boolean;
}

const TRAINING_DEVELOPMENT_LIST_URL = apiUrl('training-development-list');
const TRAINING_DEVELOPMENT_ADD_URL = apiUrl('training-development-add');
const TRAINING_DEVELOPMENT_UPDATE_URL = apiUrl('training-development-update');
const TRAINING_DEVELOPMENT_DETAIL_URL = apiUrl('training-development-detail');
const TRAINING_DEVELOPMENT_DELETE_URL = apiUrl('training-development-delete');

function toAmount(value: string | number | null | undefined): number {
  const numeric = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(numeric) ? numeric : 0;
}

/** Builds API-ready snake_case body from form draft values. */
export function buildTrainingDevelopmentSubmitPayload(
  draft: TrainingDevelopmentAddPayload,
): TrainingDevelopmentSubmitBody {
  const revised =
    draft.salary.revised_salary > 0
      ? draft.salary.revised_salary
      : draft.salary.current_salary + draft.salary.increment_amount;

  return {
    employee_code: draft.employee_code.trim(),
    employee_name: draft.employee_name.trim(),
    department: draft.department.trim(),
    location: draft.location.trim(),
    designation: draft.designation.trim(),
    job_title: draft.job_title.trim(),
    reporting_manager: draft.reporting_manager.trim(),
    employee_nature: draft.employee_nature.trim(),
    employee_type: draft.employee_type.trim(),
    grade_work_level: draft.grade_work_level.trim(),
    employment_category: draft.employment_category.trim(),
    date_of_joining: draft.date_of_joining.trim(),
    remarks: draft.remarks.trim(),
    training_detail: {
      training_title: draft.training_detail.training_title.trim(),
      training_category: draft.training_detail.training_category.trim(),
      training_type: draft.training_detail.training_type.trim(),
      training_stage: draft.training_detail.training_stage.trim(),
      training_start_date: draft.training_detail.training_start_date.trim(),
      training_end_date: draft.training_detail.training_end_date.trim(),
      training_duration: draft.training_detail.training_duration.trim(),
      trainer: draft.training_detail.trainer.trim(),
      training_objectives: draft.training_detail.training_objectives.trim(),
      skills_covered: draft.training_detail.skills_covered.trim(),
      remarks: draft.training_detail.remarks.trim(),
    },
    training_evaluation: {
      evaluation_cycle_number: draft.training_evaluation.evaluation_cycle_number.trim(),
      evaluation_date: draft.training_evaluation.evaluation_date.trim(),
      evaluation_period: draft.training_evaluation.evaluation_period.trim(),
      evaluator_name: draft.training_evaluation.evaluator_name.trim(),
      evaluation_parameter: draft.training_evaluation.evaluation_parameter.trim(),
      parameter_rating: Math.round(draft.training_evaluation.parameter_rating),
      overall_score: draft.training_evaluation.overall_score.trim(),
      performance_remarks: draft.training_evaluation.performance_remarks.trim(),
    },
    salary: {
      current_salary: Math.round(draft.salary.current_salary),
      increment_amount: Math.round(draft.salary.increment_amount),
      increment_percentage: Number(draft.salary.increment_percentage.toFixed(2)),
      revised_salary: Math.round(revised),
      effective_date_of_revision: draft.salary.effective_date_of_revision.trim(),
      reason_for_increment: draft.salary.reason_for_increment.trim(),
      approval_authority: draft.salary.approval_authority.trim(),
    },
    promotion: {
      promotion_recommended: draft.promotion.promotion_recommended === 'Yes' ? 'Yes' : 'No',
      new_designation: draft.promotion.new_designation.trim(),
      promotion_effective_date: draft.promotion.promotion_effective_date.trim(),
      performance_eligibility_check: draft.promotion.performance_eligibility_check.trim(),
      training_completion_verification:
        draft.promotion.training_completion_verification === 'Yes' ? 'Yes' : 'No',
      remarks: draft.promotion.remarks.trim(),
    },
  };
}

/** Maps add-form signals/fields into API draft shape. */
export function buildTrainingDevelopmentDraftFromForm(input: {
  employeeCode: string;
  employeeName: string;
  department: string;
  location: string;
  designation: string;
  jobTitle: string;
  reportingManager: string;
  employeeNature: string;
  employeeType: string;
  gradeWorkLevel: string;
  employmentCategory: string;
  dateOfJoining: string;
  remarks: string;
  trainingTitle: string;
  trainingCategory: string;
  trainingType: string;
  trainingStage: string;
  trainingStartDate: string;
  trainingEndDate: string;
  trainingDuration: string;
  trainer: string;
  trainingObjectives: string;
  skillsCovered: string;
  trainingDetailRemarks: string;
  evaluationCycleNumber: string;
  evaluationDate: string;
  evaluationPeriod: string;
  evaluatorName: string;
  evaluationParameter: string;
  parameterRating: string;
  overallScore: string;
  performanceRemarks: string;
  currentSalary: string;
  incrementAmount: string;
  incrementPercentage: string;
  revisedSalary: string;
  effectiveDateOfRevision: string;
  reasonForIncrement: string;
  approvalAuthority: string;
  promotionRecommended: string;
  newDesignation: string;
  promotionEffectiveDate: string;
  performanceEligibilityCheck: string;
  trainingCompletionVerification: string;
  promotionRemarks: string;
}): TrainingDevelopmentAddPayload {
  const current = toAmount(input.currentSalary);
  const incrementAmount = toAmount(input.incrementAmount);
  const incrementPercentage = toAmount(input.incrementPercentage);
  const revisedFromField = toAmount(input.revisedSalary);
  const revised =
    revisedFromField > 0
      ? revisedFromField
      : current + (incrementAmount > 0 ? incrementAmount : (current * incrementPercentage) / 100);

  return {
    employee_code: input.employeeCode,
    employee_name: input.employeeName,
    department: input.department,
    location: input.location,
    designation: input.designation,
    job_title: input.jobTitle,
    reporting_manager: input.reportingManager,
    employee_nature: input.employeeNature,
    employee_type: input.employeeType,
    grade_work_level: input.gradeWorkLevel,
    employment_category: input.employmentCategory,
    date_of_joining: input.dateOfJoining,
    remarks: input.remarks,
    training_detail: {
      training_title: input.trainingTitle,
      training_category: input.trainingCategory,
      training_type: input.trainingType,
      training_stage: input.trainingStage,
      training_start_date: input.trainingStartDate,
      training_end_date: input.trainingEndDate,
      training_duration: input.trainingDuration,
      trainer: input.trainer,
      training_objectives: input.trainingObjectives,
      skills_covered: input.skillsCovered,
      remarks: input.trainingDetailRemarks,
    },
    training_evaluation: {
      evaluation_cycle_number: input.evaluationCycleNumber,
      evaluation_date: input.evaluationDate,
      evaluation_period: input.evaluationPeriod,
      evaluator_name: input.evaluatorName,
      evaluation_parameter: input.evaluationParameter,
      parameter_rating: Math.round(toAmount(input.parameterRating)),
      overall_score: input.overallScore,
      performance_remarks: input.performanceRemarks,
    },
    salary: {
      current_salary: current,
      increment_amount: incrementAmount,
      increment_percentage: incrementPercentage,
      revised_salary: revised,
      effective_date_of_revision: input.effectiveDateOfRevision,
      reason_for_increment: input.reasonForIncrement,
      approval_authority: input.approvalAuthority,
    },
    promotion: {
      promotion_recommended: input.promotionRecommended,
      new_designation: input.newDesignation,
      promotion_effective_date: input.promotionEffectiveDate,
      performance_eligibility_check: input.performanceEligibilityCheck,
      training_completion_verification: input.trainingCompletionVerification,
      remarks: input.promotionRemarks,
    },
  };
}

@Injectable({
  providedIn: 'root',
})
export class TrainingDevelopmentService {
  private readonly http = inject(HttpClient);
  private readonly trainingList = signal<TrainingDevelopmentRecord[]>([]);

  readonly trainings = this.trainingList.asReadonly();

  fetchTrainingDevelopments(): Observable<TrainingDevelopmentRecord[]> {
    return this.http.get<unknown>(TRAINING_DEVELOPMENT_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => this.trainingList.set(records)),
    );
  }

  addTrainingDevelopment(payload: TrainingDevelopmentSubmitBody): Observable<unknown> {
    return this.http.post(TRAINING_DEVELOPMENT_ADD_URL, buildTrainingDevelopmentSubmitPayload(payload));
  }

  updateTrainingDevelopment(id: string | number, payload: TrainingDevelopmentSubmitBody): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post(
      `${TRAINING_DEVELOPMENT_UPDATE_URL}/${identifier}`,
      buildTrainingDevelopmentSubmitPayload(payload),
    );
  }

  fetchTrainingDevelopmentDetail(id: string | number): Observable<TrainingDevelopmentRecord> {
    const identifier = encodeURIComponent(String(id));
    const numericId = Number.parseInt(String(id), 10) || 0;

    return this.http.get<unknown>(`${TRAINING_DEVELOPMENT_DETAIL_URL}/${identifier}`).pipe(
      map((response) => {
        const record = this.mapDetailResponse(response);
        if (!record.Id && numericId) {
          return { ...record, Id: numericId };
        }
        return record;
      }),
    );
  }

  deleteTrainingDevelopment(id: string | number): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete(`${TRAINING_DEVELOPMENT_DELETE_URL}/${identifier}`);
  }

  removeTrainingRecord(record: TrainingDevelopmentRecord): void {
    this.trainingList.update((list) => list.filter((item) => item.Id !== record.Id));
  }

  findTrainingById(id: string | number): TrainingDevelopmentRecord | undefined {
    const numericId = Number.parseInt(String(id), 10);
    return this.trainingList().find((item) => item.Id === numericId);
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
      'training_developments',
      'training_development_list',
      'trainingDevelopmentList',
      'trainingDevelopments',
      'training_development',
      'trainingDevelopment',
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

  private mapDetailResponse(response: unknown): TrainingDevelopmentRecord {
    const items = this.extractApiItems(response);
    if (items.length > 0) {
      return this.mapApiItemToRecord(items[0]);
    }

    if (response && typeof response === 'object') {
      return this.mapApiItemToRecord(response as Record<string, unknown>);
    }

    throw new Error('Training development record not found');
  }

  private mapApiItemToRecord(item: Record<string, unknown>): TrainingDevelopmentRecord {
    const asString = (value: unknown): string =>
      value === undefined || value === null ? '' : String(value).trim();
    const asNumber = (value: unknown, fallback = 0): number => {
      const parsed = Number.parseFloat(asString(value));
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const id = asString(item['id']) || asString(item['Id']) || asString(item['training_development_id']);

    const detailSource =
      (item['training_detail'] as Record<string, unknown> | undefined) ??
      (item['trainingDetail'] as Record<string, unknown> | undefined) ??
      {};

    const evaluationSource =
      (item['training_evaluation'] as Record<string, unknown> | undefined) ??
      (item['trainingEvaluation'] as Record<string, unknown> | undefined) ??
      {};

    const salarySource =
      (item['salary'] as Record<string, unknown> | undefined) ?? {};

    const promotionSource =
      (item['promotion'] as Record<string, unknown> | undefined) ?? {};

    const trainingDetail: TrainingDetailPayload = {
      training_title:
        asString(detailSource['training_title']) || asString(detailSource['trainingTitle']),
      training_category:
        asString(detailSource['training_category']) || asString(detailSource['trainingCategory']),
      training_type:
        asString(detailSource['training_type']) || asString(detailSource['trainingType']),
      training_stage:
        asString(detailSource['training_stage']) || asString(detailSource['trainingStage']),
      training_start_date:
        asString(detailSource['training_start_date']) || asString(detailSource['trainingStartDate']),
      training_end_date:
        asString(detailSource['training_end_date']) || asString(detailSource['trainingEndDate']),
      training_duration:
        asString(detailSource['training_duration']) || asString(detailSource['trainingDuration']),
      trainer: asString(detailSource['trainer']),
      training_objectives:
        asString(detailSource['training_objectives']) || asString(detailSource['trainingObjectives']),
      skills_covered:
        asString(detailSource['skills_covered']) || asString(detailSource['skillsCovered']),
      remarks: asString(detailSource['remarks']),
    };

    const trainingEvaluation: TrainingEvaluationPayload = {
      evaluation_cycle_number:
        asString(evaluationSource['evaluation_cycle_number']) ||
        asString(evaluationSource['evaluationCycleNumber']),
      evaluation_date:
        asString(evaluationSource['evaluation_date']) || asString(evaluationSource['evaluationDate']),
      evaluation_period:
        asString(evaluationSource['evaluation_period']) || asString(evaluationSource['evaluationPeriod']),
      evaluator_name:
        asString(evaluationSource['evaluator_name']) || asString(evaluationSource['evaluatorName']),
      evaluation_parameter:
        asString(evaluationSource['evaluation_parameter']) ||
        asString(evaluationSource['evaluationParameter']),
      parameter_rating: asNumber(
        evaluationSource['parameter_rating'] ?? evaluationSource['parameterRating'],
      ),
      overall_score:
        asString(evaluationSource['overall_score']) || asString(evaluationSource['overallScore']),
      performance_remarks:
        asString(evaluationSource['performance_remarks']) ||
        asString(evaluationSource['performanceRemarks']),
    };

    const salary: TrainingSalaryPayload = {
      current_salary: asNumber(salarySource['current_salary'] ?? salarySource['currentSalary']),
      increment_amount: asNumber(salarySource['increment_amount'] ?? salarySource['incrementAmount']),
      increment_percentage: asNumber(
        salarySource['increment_percentage'] ?? salarySource['incrementPercentage'],
      ),
      revised_salary: asNumber(salarySource['revised_salary'] ?? salarySource['revisedSalary']),
      effective_date_of_revision:
        asString(salarySource['effective_date_of_revision']) ||
        asString(salarySource['effectiveDateOfRevision']),
      reason_for_increment:
        asString(salarySource['reason_for_increment']) || asString(salarySource['reasonForIncrement']),
      approval_authority:
        asString(salarySource['approval_authority']) || asString(salarySource['approvalAuthority']),
    };

    const promotion: TrainingPromotionPayload = {
      promotion_recommended:
        asString(promotionSource['promotion_recommended']) ||
        asString(promotionSource['promotionRecommended']) ||
        'No',
      new_designation:
        asString(promotionSource['new_designation']) || asString(promotionSource['newDesignation']),
      promotion_effective_date:
        asString(promotionSource['promotion_effective_date']) ||
        asString(promotionSource['promotionEffectiveDate']),
      performance_eligibility_check:
        asString(promotionSource['performance_eligibility_check']) ||
        asString(promotionSource['performanceEligibilityCheck']),
      training_completion_verification:
        asString(promotionSource['training_completion_verification']) ||
        asString(promotionSource['trainingCompletionVerification']) ||
        'No',
      remarks: asString(promotionSource['remarks']),
    };

    const employeeNature =
      asString(item['employee_nature']) || asString(item['employeeNature']) || '—';

    return {
      Id: Number.parseInt(id, 10) || 0,
      EmployeeCode: asString(item['employee_code']) || asString(item['employeeCode']) || '—',
      EmployeeName: asString(item['employee_name']) || asString(item['employeeName']) || '—',
      Department: asString(item['department']) || '—',
      Location: asString(item['location']) || '—',
      Designation: asString(item['designation']) || '—',
      JobTitle: asString(item['job_title']) || asString(item['jobTitle']) || '—',
      ReportingManager: asString(item['reporting_manager']) || asString(item['reportingManager']) || '—',
      EmployeeNature: employeeNature,
      EmployeeType: asString(item['employee_type']) || asString(item['employeeType']) || '—',
      GradeWorkLevel: asString(item['grade_work_level']) || asString(item['gradeWorkLevel']) || '—',
      EmploymentCategory:
        asString(item['employment_category']) || asString(item['employmentCategory']) || '—',
      DateOfJoining: asString(item['date_of_joining']) || asString(item['dateOfJoining']) || '—',
      Remarks: asString(item['remarks']) || '—',
      TrainingDetail: trainingDetail,
      TrainingEvaluation: trainingEvaluation,
      Salary: salary,
      Promotion: promotion,
      EmploymentNature: employeeNature,
      TrainingTitle: trainingDetail.training_title || '—',
      TrainingCategory: trainingDetail.training_category || '—',
      TrainingStage: trainingDetail.training_stage || '—',
      TrainingStartDate: trainingDetail.training_start_date || '—',
      TrainingEndDate: trainingDetail.training_end_date || '—',
      selected: false,
    };
  }
}
