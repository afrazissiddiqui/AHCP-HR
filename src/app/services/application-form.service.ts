import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, concatMap, forkJoin, from, map, of, scan, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';
import { formatDateOfBirthFromApi, formatDateForInput } from '../utils/date-format.util';

/** Extended payload captured from Create Application Form — shown in Application Form view modal only. */
export interface ApplicationFormPersonalInfo {
  personName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fatherOrHusbandName: string;
  gender: string;
  maritalStatus: string;
  dateOfBirth: string;
  nationality: string;
  religion: string;
  bloodGroup: string;
  nationalIdCardNo: string;
  incomeTaxNo: string;
  contactNumber: string;
  emergencyContactNumber: string;
  street: string;
  streetNo: string;
  buildingFloorRoom: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  employmentNature: string;
  employmentCategory: string;
  employmentStatus: string;
  departmentInAhcp: string;
  designation: string;
  jobDescription: string;
  roleSalary: string;
  workGradeLevel: string;
  branchLocation: string;
  costCenter: string;
  reportingManager: string;
  remarks: string;
}

export interface ApplicationFormEducationRow {
  institute: string;
  institution: string;
  qualification: string;
  passingYear: string;
  fromDate: string;
  toDate: string;
  subject: string;
  awardedQualification: string;
  marksGrades: string;
  notes: string;
}

export interface ApplicationFormPastExperienceRow {
  company: string;
  position: string;
  designation: string;
  duration: string;
  fromDate: string;
  toDate: string;
  duties: string;
  remarks: string;
  lastSalary: string;
}

export interface ApplicationFormRemuneration {
  basicSalary: string;
  paymentMode: string;
  accountTitle: string;
  bankName: string;
  branchName: string;
  accountNo: string;
  accountType: string;
  effectiveDate: string;
  taxPercentage: string;
  dateOfJoining: string;
  advancePercentAllowed: string;
  loanAmountAllowed: string;
  overTimeApplicable: string;
  leaveType: string;
  leaveDays: string;
  leavesAvailed: string;
  remainingLeaves: string;
  totalLeaves: string;
  medicalAllowances: string;
  fuelAllowances: string;
  mobileAllowances: string;
  carAllowances: string;
  maximumLoanCapacity: string;
  maximumAdvanceCapacity: string;
  otherAllowances: string;
  allowancesApplicable: string;
  cashSalaryPercentage: string;
  eobiApplicable: string;
  socialSecurityApplicable: string;
  fuelLimit: string;
  leaveEligibilityCriteria: string;
}

export interface ApplicationFormHrSettings {
  employeeMaster: string;
  salaryStructure: string;
  attendanceShiftManagement: string;
  leaveManagement: string;
  loanAdvancesForm: string;
  requestStatus: string;
}

export interface ApplicationFormLoginDetails {
  employeeCode: string;
  employeeName: string;
  userId: string;
  password: string;
}

export interface ApplicationFormAttachmentMeta {
  type: string;
  attachmentFor?: string;
  fileName: string;
  fileUrl: string;
}

export interface ApplicationFormRequisition {
  copyExisting: boolean;
  reqId: string;
  internalJobTitle: string;
  hiringManager: string;
  recruiter: string;
  recruitmentCollaborator: string;
  requisitionAdministrator: string;
  recruitmentCoordinator: string;
  hrAdministrator: string;
  company: string;
  department: string;
  division: string;
  location: string;
  costCenter: string;
}

export interface ApplicationFormAssets {
  assetAllocated: string;
  assetOitmCode: string;
  allocationStatus: string;
  allocationDate: string;
  allocationDateType: string;
}

export interface ApplicationFormDetail {
  personalInfo: ApplicationFormPersonalInfo;
  education: ApplicationFormEducationRow[];
  pastExperience: ApplicationFormPastExperienceRow[];
  remuneration: ApplicationFormRemuneration;
  hrSettings: ApplicationFormHrSettings;
  loginDetails: ApplicationFormLoginDetails;
  attachments: ApplicationFormAttachmentMeta[];
  requisition: ApplicationFormRequisition;
  assets?: ApplicationFormAssets;
}

export interface ApplicationFormRecord {
  EmployeeCode: string;
  EmployeeName: string;
  Department: string;
  EmployeeNature: string;
  Designation: string;
  ReportingManager: string;
  EmploymentType: string;
  EmploymentCategory: string;
  status: string;
  selected?: boolean;
  /** Backend record id for view/detail API */
  apiId?: string;
  /** Login user id — used for biometrics / attendance matching */
  userId?: string;
  /** Populated when loaded from view API or saved locally */
  detail?: ApplicationFormDetail;
}

export interface EmployeeMasterDataRecord {
  EmployeeID: number;
  EmployeeName: string;
  Department: string;
  Designation: string;
  EmploymentType: string;
  EmployeeCategory: string;
  WorkLevel: string;
  EmploymentStatus: string;
  selected: boolean;
}

const EMPLOYEE_PROFILE_ADD_URL = apiUrl('employee-profile-add');
const EMPLOYEE_PROFILE_LIST_URL = apiUrl('employee-profile-list');
const EMPLOYEE_PROFILE_VIEW_URL = apiUrl('employee-profile-detail');
const EMPLOYEE_PROFILE_UPDATE_URL = apiUrl('employee-profile-update');
const EMPLOYEE_PROFILE_DELETE_URL = apiUrl('employee-profile-delete');

export interface EmployeeProfileEducationPayload {
  institute: string;
  qualification: string;
  passingYear: string;
  fromDate: string;
  toDate: string;
  subject: string;
  marksGrades: string;
  notes: string;
}

export interface EmployeeProfilePastExperiencePayload {
  company: string;
  designation: string;
  position: string;
  duties: string;
  duration: string;
  fromDate: string;
  toDate: string;
  lastSalary: string;
  remarks: string;
}

export interface EmployeeProfileAttachmentPayload {
  type: string;
  fileName: string;
  fileUrl: string;
}

export interface EmployeeProfileRemunerationPayload {
  basicSalary: string;
  paymentMode: string;
  accountTitle: string;
  bankName: string;
  accountNo: string;
  accountType: string;
  effectiveDate: string;
  taxPercentage: string;
  dateOfJoining: string;
  cashSalaryPercentage: string;
  advancePercentAllowed: string;
  maximumLoanCapacity: string;
  maximumAdvanceCapacity: string;
  overTimeApplicable: string;
  allowancesApplicable: string;
  eobiApplicable: string;
  socialSecurityApplicable: string;
  fuelLimit: string;
  leaveEligibilityCriteria: string;
  leaveType: string;
  leaveDays: string;
  leavesAvailed: string;
  remainingLeaves: string;
  medicalAllowances: string;
  fuelAllowances: string;
  mobileAllowances: string;
  carAllowances: string;
  otherAllowances: string;
}

export interface EmployeeProfileLoginDetailPayload {
  employeeCode: string;
  userId: string;
  loginEmployeeName: string;
  password: string;
}

export interface EmployeeProfileAssetsPayload {
  assetAllocated: string;
  allocationStatus: string;
  allocationDateType: string;
  allocationDate: string;
}

export interface EmployeeProfileAddPayload {
  jobSpecificationId: string;
  personName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fatherOrHusbandName: string;
  gender: string;
  maritalStatus: string;
  dateOfBirth: string;
  nationality: string;
  religion: string;
  bloodGroup: string;
  nationalIdCardNo: string;
  incomeTaxNo: string;
  contactNumber: string;
  emergencyContactNumber: string;
  street: string;
  streetNo: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  departmentInAhcp: string;
  branchLocation: string;
  employmentCategory: string;
  workGradeLevel: string;
  designation: string;
  hiringManager: string;
  reportingManager: string;
  employmentStatus: string;
  remarks: string;
  jobDescription: string;
  education: EmployeeProfileEducationPayload[];
  pastExperience: EmployeeProfilePastExperiencePayload[];
  attachments: EmployeeProfileAttachmentPayload[];
  remuneration: EmployeeProfileRemunerationPayload;
  loginDetail: EmployeeProfileLoginDetailPayload;
  assets: EmployeeProfileAssetsPayload;
}

const REMUNERATION_FIELD_KEYS: ReadonlyArray<[camel: string, snake: string]> = [
  ['basicSalary', 'basic_salary'],
  ['paymentMode', 'payment_mode'],
  ['accountTitle', 'account_title'],
  ['bankName', 'bank_name'],
  ['branchName', 'branch_name'],
  ['accountNo', 'account_no'],
  ['accountType', 'account_type'],
  ['effectiveDate', 'effective_date'],
  ['taxPercentage', 'tax_percentage'],
  ['dateOfJoining', 'date_of_joining'],
  ['cashSalaryPercentage', 'cash_salary_percentage'],
  ['advancePercentAllowed', 'advance_percent_allowed'],
  ['maximumLoanCapacity', 'maximum_loan_capacity'],
  ['loanAmountAllowed', 'loan_amount_allowed'],
  ['overTimeApplicable', 'over_time_applicable'],
  ['allowancesApplicable', 'allowances_applicable'],
  ['eobiApplicable', 'eobi_applicable'],
  ['socialSecurityApplicable', 'social_security_applicable'],
  ['fuelLimit', 'fuel_limit'],
  ['leaveEligibilityCriteria', 'leave_eligibility_criteria'],
  ['leaveType', 'leave_type'],
  ['leaveDays', 'leave_days'],
  ['leavesAvailed', 'leaves_availed'],
  ['remainingLeaves', 'remaining_leaves'],
  ['totalLeaves', 'total_leaves'],
  ['medicalAllowances', 'medical_allowances'],
  ['fuelAllowances', 'fuel_allowances'],
  ['mobileAllowances', 'mobile_allowances'],
  ['carAllowances', 'car_allowances'],
  ['maximumAdvanceCapacity', 'maximum_advance_capacity'],
  ['otherAllowances', 'other_allowances'],
];

const REMUNERATION_EXTRA_KEYS: Readonly<Record<string, readonly string[]>> = {
  medicalAllowances: ['medicalAllowance', 'medical_allowance', 'MedicalAllowances', 'MedicalAllowance'],
  fuelAllowances: ['fuelAllowance', 'fuel_allowance', 'FuelAllowances', 'FuelAllowance'],
  mobileAllowances: ['mobileAllowance', 'mobile_allowance', 'MobileAllowances', 'MobileAllowance'],
  carAllowances: ['carAllowance', 'car_allowance', 'CarAllowances', 'CarAllowance'],
  otherAllowances: [
    'otherAllowance',
    'other_allowance',
    'OtherAllowances',
    'OtherAllowance',
    'packagePerks',
    'package_perks',
  ],
  maximumLoanCapacity: ['loanAmountAllowed', 'loan_amount_allowed', 'MaximumLoanCapacity', 'LoanAmountAllowed'],
  maximumAdvanceCapacity: ['advanceCapacity', 'advance_capacity', 'MaximumAdvanceCapacity', 'AdvanceCapacity'],
};

@Injectable({
  providedIn: 'root'
})
export class ApplicationFormService {
  private readonly http = inject(HttpClient);
  private readonly applicationRecords = signal<ApplicationFormRecord[]>([]);
  private readonly attachmentMetaCache = new Map<string, ApplicationFormAttachmentMeta[]>();

  getApplicationRecords(): ApplicationFormRecord[] {
    return this.applicationRecords();
  }

  cacheEmployeeAttachments(identifier: string, attachments: ApplicationFormAttachmentMeta[]): void {
    const key = identifier.trim();
    if (!key || !attachments.length) {
      return;
    }
    this.attachmentMetaCache.set(
      key,
      attachments.map((attachment) => ({ ...attachment })),
    );
  }

  extractApiIdFromResponse(response: unknown): string {
    if (!response || typeof response !== 'object') {
      return '';
    }
    const obj = response as Record<string, unknown>;
    const data = obj['data'];
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const nestedId = (data as Record<string, unknown>)['id'];
      if (nestedId !== undefined && nestedId !== null) {
        return String(nestedId).trim();
      }
    }
    const id = obj['id'];
    return id !== undefined && id !== null ? String(id).trim() : '';
  }

  resolveAttachmentForLabel(attachment: ApplicationFormAttachmentMeta): string {
    return attachment.type?.trim() || attachment.attachmentFor?.trim() || '';
  }

  private mergeAttachmentsWithCache(
    identifiers: Array<string | number | undefined | null>,
    attachments: ApplicationFormAttachmentMeta[],
  ): ApplicationFormAttachmentMeta[] {
    let cached: ApplicationFormAttachmentMeta[] | undefined;
    for (const identifier of identifiers) {
      if (identifier === undefined || identifier === null) {
        continue;
      }
      const key = String(identifier).trim();
      if (key && this.attachmentMetaCache.has(key)) {
        cached = this.attachmentMetaCache.get(key);
        break;
      }
    }

    if (!cached?.length) {
      return attachments;
    }

    return attachments.map((attachment, index) => {
      const cachedMatch =
        cached![index] ??
        cached!.find(
          (item) =>
            item.fileName === attachment.fileName &&
            (item.fileUrl === attachment.fileUrl || !item.fileUrl || !attachment.fileUrl),
        ) ??
        cached!.find((item) => item.fileName === attachment.fileName);

      const label =
        attachment.type ||
        attachment.attachmentFor ||
        cachedMatch?.type ||
        cachedMatch?.attachmentFor ||
        '';

      return {
        ...attachment,
        type: label,
        attachmentFor: label,
      };
    });
  }

  getNextEmployeeCode(): number {
    const records = this.applicationRecords();
    if (records.length === 0) {
      return 1;
    }

    const numbers = records
      .map((record) => this.parseEmployeeCodeSequence(record.EmployeeCode))
      .filter((value) => value > 0);

    if (numbers.length === 0) {
      return 1;
    }

    return Math.max(...numbers) + 1;
  }

  parseEmployeeCodeSequence(value: string): number {
    const trimmed = String(value ?? '').trim();
    if (!trimmed || trimmed === '—') {
      return 0;
    }

    const direct = Number.parseInt(trimmed, 10);
    if (Number.isFinite(direct) && direct > 0 && String(direct) === trimmed) {
      return direct;
    }

    const match = trimmed.match(/(\d+)$/);
    if (match) {
      return Number.parseInt(match[1], 10) || 0;
    }

    return 0;
  }

  formatEmployeeUserId(code: number): string {
    return `Emp-${String(code).padStart(8, '0')}`;
  }

  addApplicationRecord(record: ApplicationFormRecord): void {
    this.applicationRecords.update((list) => [...list, record]);
  }

  removeApplicationRecord(record: ApplicationFormRecord): void {
    this.applicationRecords.update((list) =>
      list.filter((item) =>
        record.apiId
          ? item.apiId !== record.apiId
          : item.EmployeeCode !== record.EmployeeCode,
      ),
    );
  }

  addEmployeeProfile(payload: EmployeeProfileAddPayload): Observable<unknown> {
    return this.http.post(EMPLOYEE_PROFILE_ADD_URL, payload);
  }

  updateEmployeeProfile(id: string | number, payload: EmployeeProfileAddPayload): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post(`${EMPLOYEE_PROFILE_UPDATE_URL}/${identifier}`, payload);
  }

  deleteEmployeeProfile(id: string | number): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete(`${EMPLOYEE_PROFILE_DELETE_URL}/${identifier}`);
  }

  fetchEmployeeProfiles(): Observable<ApplicationFormRecord[]> {
    return this.http.get<unknown>(EMPLOYEE_PROFILE_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => {
        this.applicationRecords.set(records);
      }),
    );
  }

  fetchEmployeeProfileDetail(id: string | number): Observable<ApplicationFormRecord> {
    const identifier = encodeURIComponent(String(id));
    return this.http.get<unknown>(`${EMPLOYEE_PROFILE_VIEW_URL}/${identifier}`).pipe(
      map((response) => {
        const item = this.extractApiSingle(response);
        if (!item) {
          throw new Error('Employee profile not found.');
        }
        return this.mapApiItemToFullRecord(item);
      }),
    );
  }

  /**
   * Loads employee profile details in small batches to avoid API rate limits (HTTP 429).
   * Emits the accumulated list after each batch so callers can render progressively.
   */
  fetchEmployeeProfileDetailsInBatches(
    records: ApplicationFormRecord[],
    batchSize = 5,
  ): Observable<ApplicationFormRecord[]> {
    const targets = records.filter((record) => !!record.apiId);
    if (targets.length === 0) {
      return of([]);
    }

    const safeBatchSize = Math.max(1, batchSize);

    return from(this.chunkRecords(targets, safeBatchSize)).pipe(
      concatMap((batch) =>
        forkJoin(
          batch.map((record) =>
            this.fetchEmployeeProfileDetail(record.apiId!).pipe(
              catchError(() => of(record)),
            ),
          ),
        ),
      ),
      scan((allResults, batchResults) => [...allResults, ...batchResults], [] as ApplicationFormRecord[]),
    );
  }

  private chunkRecords<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }

  private extractApiSingle(response: unknown): Record<string, unknown> | null {
    if (!response || typeof response !== 'object') {
      return null;
    }
    if (Array.isArray(response)) {
      const first = response[0];
      if (!first || typeof first !== 'object') {
        return null;
      }
      return this.normalizeEmployeeProfileItem(first as Record<string, unknown>);
    }

    return this.normalizeEmployeeProfileItem(response as Record<string, unknown>);
  }

  private normalizeEmployeeProfileItem(wrapper: Record<string, unknown>): Record<string, unknown> | null {
    const unwrapped = this.unwrapEmployeeProfileRecord(wrapper);
    if (!unwrapped) {
      return null;
    }

    let merged = this.mergeFlatRemunerationFields(wrapper, unwrapped);

    for (const key of ['data', 'Data', 'result', 'Result']) {
      const nested = this.pickNestedRecord(wrapper[key]);
      if (nested && nested !== unwrapped) {
        merged = this.mergeFlatRemunerationFields(nested, merged);
      }
    }

    const resolvedRemuneration = this.resolveRemunerationSource(merged);
    if (Object.keys(resolvedRemuneration).length === 0) {
      return merged;
    }

    const existingNested = this.pickNestedRecord(merged['remuneration']);
    return {
      ...merged,
      remuneration: {
        ...(existingNested ?? {}),
        ...resolvedRemuneration,
      },
    };
  }

  private unwrapEmployeeProfileRecord(
    obj: Record<string, unknown>,
    ancestors: Record<string, unknown>[] = [],
  ): Record<string, unknown> | null {
    if (this.looksLikeEmployeeProfileRecord(obj)) {
      let result = { ...obj };
      for (let index = ancestors.length - 1; index >= 0; index -= 1) {
        result = this.mergeFlatRemunerationFields(ancestors[index], result);
      }
      return this.mergeFlatRemunerationFields(obj, result);
    }

    const nestedKeys = [
      'data',
      'Data',
      'employee',
      'Employee',
      'profile',
      'Profile',
      'user',
      'User',
      'employeeProfile',
      'employee_profile',
      'EmployeeProfile',
      'result',
      'Result',
    ];

    const nextAncestors = [...ancestors, obj];
    for (const key of nestedKeys) {
      const nested = obj[key];
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const unwrapped = this.unwrapEmployeeProfileRecord(
          nested as Record<string, unknown>,
          nextAncestors,
        );
        if (unwrapped) {
          return this.mergeFlatRemunerationFields(obj, unwrapped);
        }
      }
    }

    return this.looksLikeEmployeeProfileRecord(obj) ? obj : null;
  }

  private mergeFlatRemunerationFields(
    source: Record<string, unknown>,
    target: Record<string, unknown>,
  ): Record<string, unknown> {
    const merged = { ...target };
    const layers = [source, this.resolveRemunerationSource(source)];

    for (const layer of layers) {
      if (!layer || Object.keys(layer).length === 0) {
        continue;
      }

      for (const [camel, snake] of REMUNERATION_FIELD_KEYS) {
        const flatValue = this.pickRemunerationValue(layer, camel, snake);
        if (flatValue !== '' && this.pickRemunerationValue(merged, camel, snake) === '') {
          merged[camel] = flatValue;
        }
      }
    }

    const resolvedRemuneration = this.resolveRemunerationSource(merged);
    if (Object.keys(resolvedRemuneration).length > 0) {
      const existingNested = this.pickNestedRecord(merged['remuneration']);
      merged['remuneration'] = {
        ...(existingNested ?? {}),
        ...resolvedRemuneration,
      };
    }

    return merged;
  }

  private looksLikeEmployeeProfileRecord(obj: Record<string, unknown>): boolean {
    return !!(
      obj['personName'] ||
      obj['person_name'] ||
      obj['firstName'] ||
      obj['first_name'] ||
      obj['employeeCode'] ||
      obj['employee_code'] ||
      obj['remuneration'] ||
      obj['Remuneration'] ||
      obj['basicSalary'] ||
      obj['basic_salary'] ||
      obj['loginDetail'] ||
      obj['loginDetails'] ||
      obj['login_detail']
    );
  }

  private resolveRemunerationSource(item: Record<string, unknown>): Record<string, unknown> {
    const merged: Record<string, unknown> = {};

    const nestedCandidates = [
      item['remuneration'],
      item['Remuneration'],
      item['remunerationDetails'],
      item['remuneration_details'],
    ];

    for (const candidate of nestedCandidates) {
      if (typeof candidate === 'string' && candidate.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(candidate) as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            this.mergeNonEmptyRemunerationFields(merged, parsed as Record<string, unknown>);
          }
        } catch {
          // Ignore invalid JSON strings.
        }
        continue;
      }

      const nested = this.pickNestedRecord(candidate);
      if (nested) {
        this.mergeNonEmptyRemunerationFields(merged, nested);
      }
    }

    for (const [camel, snake] of REMUNERATION_FIELD_KEYS) {
      const flatValue = this.pickRemunerationValue(item, camel, snake);
      if (flatValue !== '' && this.pickRemunerationValue(merged, camel, snake) === '') {
        merged[camel] = flatValue;
      }
    }

    return merged;
  }

  private mergeNonEmptyRemunerationFields(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): void {
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined || value === null || String(value).trim() === '') {
        continue;
      }

      if (!target[key] || String(target[key]).trim() === '') {
        target[key] = value;
      }
    }
  }

  private pickRemunerationValue(
    source: Record<string, unknown>,
    camel: string,
    snake?: string,
  ): string {
    const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
    const extra = REMUNERATION_EXTRA_KEYS[camel] ?? [];
    const keys = [camel, snake, pascal, ...extra].filter(
      (key, index, list): key is string => !!key && list.indexOf(key) === index,
    );

    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }

    return '';
  }

  private pickFieldValue(
    source: Record<string, unknown>,
    camel: string,
    snake?: string,
  ): string {
    const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
    const keys = [camel, snake, pascal].filter((key): key is string => !!key);

    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }

    return '';
  }

  private pickRemField(
    item: Record<string, unknown>,
    remunerationSource: Record<string, unknown>,
    camel: string,
    snake?: string,
  ): string {
    const fromRemuneration = this.pickRemunerationValue(remunerationSource, camel, snake);
    if (fromRemuneration !== '') {
      return fromRemuneration;
    }

    return this.pickRemunerationValue(item, camel, snake);
  }

  private extractApiItems(response: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }
    if (response && typeof response === 'object') {
      const candidate = (response as { data?: unknown; users?: unknown }).data
        ?? (response as { data?: unknown; users?: unknown }).users;
      if (Array.isArray(candidate)) {
        return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      }
    }
    return [];
  }

  private resolveEmployeeCodeFromApiItem(item: Record<string, unknown>): string {
    const asString = (value: unknown): string =>
      value === undefined || value === null ? '' : String(value).trim();

    const loginSource =
      this.pickNestedRecord(item['loginDetail']) ??
      this.pickNestedRecord(item['loginDetails']) ??
      this.pickNestedRecord(item['login_detail']);

    const fromLogin = loginSource
      ? pickFrom(loginSource, 'employeeCode', 'employee_code') ||
        pickFrom(loginSource, 'userId', 'user_id')
      : '';

    const employeeCode =
      asString(item['employeeCode']) ||
      asString(item['employee_code']) ||
      fromLogin ||
      asString(item['userId']) ||
      asString(item['user_id']) ||
      '';

    return employeeCode || '—';
  }

  private resolveUserIdFromApiItem(item: Record<string, unknown>): string {
    const asString = (value: unknown): string =>
      value === undefined || value === null ? '' : String(value).trim();

    const loginSource =
      this.pickNestedRecord(item['loginDetail']) ??
      this.pickNestedRecord(item['loginDetails']) ??
      this.pickNestedRecord(item['login_detail']);

    const fromLogin = loginSource
      ? pickFrom(loginSource, 'userId', 'user_id')
      : '';

    const topLevel = asString(item['userId']) || asString(item['user_id']);
    if (fromLogin || topLevel) {
      return fromLogin || topLevel;
    }

    const employeeCode = asString(item['employeeCode']) || asString(item['employee_code']);
    if (/^Emp-\d+$/i.test(employeeCode)) {
      return employeeCode;
    }

    return '';
  }

  private mapApiItemToRecord(item: Record<string, unknown>): ApplicationFormRecord {
    const asString = (value: unknown): string =>
      value === undefined || value === null ? '' : String(value).trim();

    const employeeCode = this.resolveEmployeeCodeFromApiItem(item);
    const personName = asString(item['personName']) || asString(item['person_name']);
    const composedName = [asString(item['firstName']), asString(item['middleName']), asString(item['lastName'])]
      .filter(Boolean)
      .join(' ');
    const loginEmployeeName =
      asString(item['loginEmployeeName']) || asString(item['login_employee_name']);
    const employeeName = personName || composedName || loginEmployeeName;

    const apiId = asString(item['id']) || (employeeCode !== '—' ? employeeCode : '');
    const userId = this.resolveUserIdFromApiItem(item);

    return {
      EmployeeCode: employeeCode,
      EmployeeName: employeeName || '—',
      Department:
        asString(item['departmentInAhcp']) ||
        asString(item['department_in_ahcp']) ||
        asString(item['department']) ||
        '—',
      EmployeeNature:
        asString(item['employmentNature']) ||
        asString(item['employment_nature']) ||
        '—',
      Designation: asString(item['designation']) || '—',
      ReportingManager:
        asString(item['reportingManager']) ||
        asString(item['reporting_manager']) ||
        asString(item['hiringManager']) ||
        asString(item['hiring_manager']) ||
        '—',
      EmploymentType: asString(item['employmentType']) || asString(item['employment_type']) || '—',
      EmploymentCategory:
        asString(item['employeeCategory']) ||
        asString(item['employee_category']) ||
        asString(item['employmentCategory']) ||
        asString(item['employment_category']) ||
        '—',
      status:
        asString(item['employmentStatus']) ||
        asString(item['employment_status']) ||
        'Active',
      selected: false,
      apiId: apiId || undefined,
      userId: userId || undefined,
    };
  }

  private mapApiItemToFullRecord(item: Record<string, unknown>): ApplicationFormRecord {
    const summary = this.mapApiItemToRecord(item);
    const asString = (value: unknown): string =>
      value === undefined || value === null ? '' : String(value).trim();
    const pick = (camel: string, snake?: string): string =>
      asString(item[camel]) || (snake ? asString(item[snake]) : '');

    const educationRaw =
      item['educationSections'] ??
      item['education_sections'] ??
      item['education'] ??
      [];
    const experienceRaw =
      item['pastExperienceSections'] ??
      item['past_experience_sections'] ??
      item['pastExperience'] ??
      item['past_experience'] ??
      [];
    const attachmentsRaw = item['attachments'] ?? [];

    const asNumberString = (value: unknown): string => {
      if (value === undefined || value === null || value === '') {
        return '';
      }
      return String(value).trim();
    };

    const education = Array.isArray(educationRaw)
      ? educationRaw
          .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
          .map((row) => {
            const institution = pickFrom(row, 'institution') || pickFrom(row, 'institute');
            return {
              institute: institution,
              institution,
              qualification: pickFrom(row, 'qualification'),
              passingYear: pickFrom(row, 'passingYear', 'passing_year'),
              fromDate: formatDateForInput(pickFrom(row, 'fromDate', 'from_date')),
              toDate: formatDateForInput(pickFrom(row, 'toDate', 'to_date')),
              subject: pickFrom(row, 'subject'),
              awardedQualification: pickFrom(row, 'awardedQualification', 'awarded_qualification'),
              marksGrades: pickFrom(row, 'marksGrades', 'marks_grades'),
              notes: pickFrom(row, 'notes'),
            };
          })
      : [];

    const pastExperience = Array.isArray(experienceRaw)
      ? experienceRaw
          .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
          .map((row) => {
            const designation = pickFrom(row, 'designation') || pickFrom(row, 'position');
            return {
              company: pickFrom(row, 'company'),
              position: designation,
              designation,
              duration: pickFrom(row, 'duration'),
              fromDate: formatDateForInput(pickFrom(row, 'fromDate', 'from_date')),
              toDate: formatDateForInput(pickFrom(row, 'toDate', 'to_date')),
              duties: pickFrom(row, 'duties'),
              remarks: pickFrom(row, 'remarks'),
              lastSalary: asString(row['lastSalary'] ?? row['last_salary']),
            };
          })
      : [];

    const attachments = Array.isArray(attachmentsRaw)
      ? attachmentsRaw
          .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
          .map((row) => {
            const attachmentFor =
              pickFrom(row, 'attachmentFor', 'attachment_for') ||
              pickFrom(row, 'type') ||
              pickFrom(row, 'documentType', 'document_type');
            return {
              type: attachmentFor,
              attachmentFor,
              fileName: pickFrom(row, 'fileName', 'file_name') || pickFrom(row, 'file'),
              fileUrl: pickFrom(row, 'fileUrl', 'file_url'),
            };
          })
      : [];

    const mergedAttachments = this.mergeAttachmentsWithCache(
      [
        summary.apiId,
        asString(item['id']),
        asString(item['employeeCode']),
        asString(item['employee_code']),
        asString(item['userId']),
        asString(item['user_id']),
        summary.EmployeeCode,
      ],
      attachments,
    );

    const remunerationSource = this.resolveRemunerationSource(item);
    const loginSource =
      this.pickNestedRecord(item['loginDetail']) ??
      this.pickNestedRecord(item['loginDetails']) ??
      this.pickNestedRecord(item['login_detail']);

    const pickRem = (camel: string, snake?: string): string =>
      this.pickRemField(item, remunerationSource, camel, snake);

    const pickLogin = (camel: string, snake?: string): string =>
      (loginSource ? pickFrom(loginSource, camel, snake) : '') || pickFrom(item, camel, snake);

    const overTimeRaw = pickRem('overTimeApplicable', 'over_time_applicable');
    const overTimeApplicable = this.yesNoFromApi(overTimeRaw);

    const roleSalary =
      pick('roleSalary', 'role_salary') || pick('roleAndSalary', 'role_and_salary');
    const salaryStructure = pick('salaryStructure', 'salary_structure') || roleSalary;
    const jobSpecificationId = pick('jobSpecificationId', 'job_specification_id');

    const detail: ApplicationFormDetail = {
      personalInfo: {
        personName: pick('personName', 'person_name'),
        firstName: pick('firstName', 'first_name'),
        middleName: pick('middleName', 'middle_name'),
        lastName: pick('lastName', 'last_name'),
        fatherOrHusbandName: pick('fatherOrHusbandName', 'father_or_husband_name'),
        gender: pick('gender'),
        maritalStatus: pick('maritalStatus', 'marital_status'),
        dateOfBirth: formatDateOfBirthFromApi(pick('dateOfBirth', 'date_of_birth')),
        nationality: pick('nationality'),
        religion: pick('religion'),
        bloodGroup: pick('bloodGroup', 'blood_group'),
        nationalIdCardNo: pick('nationalIdCardNo', 'national_id_card_no'),
        incomeTaxNo: pick('incomeTaxNo', 'income_tax_no'),
        contactNumber: pick('contactNumber', 'contact_number'),
        emergencyContactNumber: pick('emergencyContactNumber', 'emergency_contact_number'),
        street: pick('street'),
        streetNo: pick('streetNo', 'street_no'),
        buildingFloorRoom: pick('buildingFloorRoom', 'building_floor_room'),
        city: pick('city'),
        state: pick('state'),
        country: pick('country'),
        zipCode: pick('zipCode', 'zip_code'),
        employmentNature: pick('employmentNature', 'employment_nature'),
        employmentCategory:
          pick('employeeCategory', 'employee_category') ||
          pick('employmentCategory', 'employment_category'),
        employmentStatus: pick('employmentStatus', 'employment_status'),
        departmentInAhcp: pick('department') || pick('departmentInAhcp', 'department_in_ahcp'),
        designation: pick('designation'),
        jobDescription: pick('jobDescription', 'job_description'),
        roleSalary,
        workGradeLevel:
          pick('workGradeLevel', 'work_grade_level') || roleSalary || salaryStructure,
        branchLocation:
          pick('branchLocation', 'branch_location') || pick('branch', 'branch') || pick('location', 'location'),
        costCenter: pick('costCenter', 'cost_center'),
        reportingManager:
          pick('reportingManager', 'reporting_manager') ||
          pick('hiringManager', 'hiring_manager'),
        remarks: pick('remarks'),
      },
      education,
      pastExperience,
      remuneration: {
        basicSalary: pickRem('basicSalary', 'basic_salary'),
        paymentMode: pickRem('paymentMode', 'payment_mode'),
        accountTitle: pickRem('accountTitle', 'account_title'),
        bankName: pickRem('bankName', 'bank_name'),
        branchName: pickRem('branchName', 'branch_name'),
        accountNo: pickRem('accountNo', 'account_no'),
        accountType: pickRem('accountType', 'account_type'),
        effectiveDate: formatDateForInput(pickRem('effectiveDate', 'effective_date')),
        taxPercentage:
          pickRem('taxPercentage', 'tax_percentage') ||
          pickRem('taxArrangementPercentage', 'tax_arrangement_percentage'),
        dateOfJoining: formatDateForInput(pickRem('dateOfJoining', 'date_of_joining')),
        advancePercentAllowed: pickRem('advancePercentAllowed', 'advance_percent_allowed'),
        loanAmountAllowed:
          pickRem('loanAmountAllowed', 'loan_amount_allowed') ||
          pickRem('maximumLoanCapacity', 'maximum_loan_capacity'),
        overTimeApplicable,
        leaveType: pickRem('leaveType', 'leave_type'),
        leaveDays: asNumberString(pickRem('leaveDays', 'leave_days')),
        leavesAvailed: asNumberString(pickRem('leavesAvailed', 'leaves_availed')),
        remainingLeaves: asNumberString(pickRem('remainingLeaves', 'remaining_leaves')),
        totalLeaves: asNumberString(pickRem('totalLeaves', 'total_leaves')),
        medicalAllowances: asNumberString(pickRem('medicalAllowances', 'medical_allowances')),
        fuelAllowances: asNumberString(pickRem('fuelAllowances', 'fuel_allowances')),
        mobileAllowances: asNumberString(pickRem('mobileAllowances', 'mobile_allowances')),
        carAllowances: asNumberString(pickRem('carAllowances', 'car_allowances')),
        maximumLoanCapacity: asNumberString(
          pickRem('maximumLoanCapacity', 'maximum_loan_capacity') ||
          pickRem('loanAmountAllowed', 'loan_amount_allowed'),
        ),
        maximumAdvanceCapacity: asNumberString(
          pickRem('maximumAdvanceCapacity', 'maximum_advance_capacity'),
        ),
        otherAllowances: asNumberString(pickRem('otherAllowances', 'other_allowances')),
        allowancesApplicable: this.yesNoFromApi(
          pickRem('allowancesApplicable', 'allowances_applicable'),
        ),
        cashSalaryPercentage:
          pickRem('cashSalaryPercentage', 'cash_salary_percentage') ||
          pickRem('percentageOfSalaryInCash', 'percentage_of_salary_in_cash'),
        eobiApplicable: this.yesNoFromApi(pickRem('eobiApplicable', 'eobi_applicable')),
        socialSecurityApplicable: this.yesNoFromApi(
          pickRem('socialSecurityApplicable', 'social_security_applicable'),
        ),
        fuelLimit: pickRem('fuelLimit', 'fuel_limit'),
        leaveEligibilityCriteria: pickRem('leaveEligibilityCriteria', 'leave_eligibility_criteria'),
      },
      hrSettings: {
        employeeMaster: asNumberString(item['employeeMaster'] ?? item['employee_master']),
        salaryStructure,
        attendanceShiftManagement: pick('attendanceShiftManagement', 'attendance_shift_management'),
        leaveManagement: pick('leaveManagement', 'leave_management'),
        loanAdvancesForm: pick('loanAdvancesForm', 'loan_advances_form'),
        requestStatus: pick('requestStatus', 'request_status'),
      },
      loginDetails: {
        employeeCode: pickLogin('employeeCode', 'employee_code') || pickLogin('userId', 'user_id'),
        employeeName: pickLogin('loginEmployeeName', 'login_employee_name'),
        userId: pickLogin('userId', 'user_id'),
        password: pickLogin('password'),
      },
      attachments: mergedAttachments,
      requisition: {
        copyExisting: false,
        reqId: jobSpecificationId,
        internalJobTitle: summary.Designation !== '—' ? summary.Designation : '',
        hiringManager:
          pick('hiringManager', 'hiring_manager') ||
          pick('reportingManager', 'reporting_manager') ||
          (summary.ReportingManager !== '—' ? summary.ReportingManager : ''),
        recruiter: '',
        recruitmentCollaborator: '',
        requisitionAdministrator: '',
        recruitmentCoordinator: '',
        hrAdministrator: '',
        company: summary.EmployeeNature !== '—' ? summary.EmployeeNature : '',
        department: summary.Department !== '—' ? summary.Department : '',
        division: summary.EmploymentType !== '—' ? summary.EmploymentType : '',
        location:
          pick('branchLocation', 'branch_location') || pick('branch', 'branch') || pick('location', 'location'),
        costCenter: pick('costCenter', 'cost_center'),
      },
      assets: this.mapApiAssets(item),
    };

    return {
      ...summary,
      userId: detail.loginDetails.userId?.trim() || summary.userId,
      EmployeeCode:
        detail.loginDetails.employeeCode && detail.loginDetails.employeeCode !== '—'
          ? detail.loginDetails.employeeCode
          : summary.EmployeeCode,
      EmployeeName: detail.personalInfo.personName || summary.EmployeeName,
      detail,
    };
  }

  findRecordByLoginUserId(userId: string): ApplicationFormRecord | undefined {
    const normalized = userId.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }
    return this.applicationRecords().find((record) => {
      const loginUserId = record.detail?.loginDetails.userId?.trim().toLowerCase() ?? '';
      const employeeCode = String(record.EmployeeCode);
      return loginUserId === normalized || employeeCode === normalized;
    });
  }

  /** Profile for the signed-in user when a matching employee application record exists. */
  getSignedInUserRecord(sessionUserId: string | null): ApplicationFormRecord | undefined {
    if (!sessionUserId?.trim()) {
      return undefined;
    }
    return this.findRecordByLoginUserId(sessionUserId);
  }

  updateLoginPassword(sessionUserId: string, newPassword: string): boolean {
    const normalized = sessionUserId.trim().toLowerCase();
    if (!normalized || !newPassword.trim()) {
      return false;
    }

    let updated = false;
    this.applicationRecords.update((list) =>
      list.map((record) => {
        const loginUserId = record.detail?.loginDetails.userId?.trim().toLowerCase() ?? '';
        if (loginUserId !== normalized) {
          return record;
        }
        updated = true;
        return {
          ...record,
          detail: record.detail
            ? {
                ...record.detail,
                loginDetails: {
                  ...record.detail.loginDetails,
                  password: newPassword,
                },
              }
            : record.detail,
        };
      })
    );
    return updated;
  }

  getEmployeeMasterDataRecords(): EmployeeMasterDataRecord[] {
    return this.applicationRecords().map((record) => ({
      EmployeeID: this.parseEmployeeCodeSequence(record.EmployeeCode),
      EmployeeName: record.EmployeeName,
      Department: record.Department,
      Designation: record.Designation,
      EmploymentType: record.EmploymentType,
      EmployeeCategory: record.EmploymentCategory,
      WorkLevel: record.EmployeeNature,
      EmploymentStatus: record.status,
      selected: record.selected ?? false
    }));
  }

  private pickNestedRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private mapApiAssets(item: Record<string, unknown>): ApplicationFormAssets {
    const nested = item['assets'] ?? item['Assets'];
    const source =
      nested && typeof nested === 'object' && !Array.isArray(nested)
        ? (nested as Record<string, unknown>)
        : item;

    const pickAsset = (camel: string, snake: string): string => pickFrom(source, camel, snake);

    return {
      assetAllocated: pickAsset('assetAllocated', 'asset_allocated'),
      assetOitmCode: pickAsset('assetOitmCode', 'asset_oitm_code') || pickAsset('oitmCode', 'oitm_code'),
      allocationStatus: pickAsset('allocationStatus', 'allocation_status'),
      allocationDate: formatDateForInput(pickAsset('allocationDate', 'allocation_date')),
      allocationDateType: pickAsset('allocationDateType', 'allocation_date_type'),
    };
  }

  private yesNoFromApi(value: unknown): string {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    const normalized = value === undefined || value === null ? '' : String(value).trim();
    if (!normalized) {
      return '';
    }
    if (normalized.toLowerCase() === 'true' || normalized === '1') {
      return 'Yes';
    }
    if (normalized.toLowerCase() === 'false' || normalized === '0') {
      return 'No';
    }
    if (normalized.toLowerCase() === 'yes') {
      return 'Yes';
    }
    if (normalized.toLowerCase() === 'no') {
      return 'No';
    }
    return normalized;
  }
}

function pickFrom(row: Record<string, unknown>, camel: string, snake?: string): string {
  const camelValue = row[camel];
  if (camelValue !== undefined && camelValue !== null && String(camelValue).trim() !== '') {
    return String(camelValue).trim();
  }
  if (snake) {
    const snakeValue = row[snake];
    if (snakeValue !== undefined && snakeValue !== null) {
      return String(snakeValue).trim();
    }
  }
  return '';
}