import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';
import { formatDateOfBirthFromApi } from '../utils/date-format.util';

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
  roleAndSalary: string;
}

export interface ApplicationFormEducationRow {
  institute: string;
  fromDate: string;
  toDate: string;
  subject: string;
  qualification: string;
  awardedQualification: string;
  marksGrades: string;
  notes: string;
}

export interface ApplicationFormPastExperienceRow {
  company: string;
  position: string;
  fromDate: string;
  toDate: string;
  duties: string;
  remarks: string;
  lastSalary: string;
}

export interface ApplicationFormRemuneration {
  basicSalary: string;
  medicalAllowances: string;
  fuelAllowances: string;
  mobileAllowances: string;
  carAllowances: string;
  maximumLoanCapacity: string;
  maximumAdvanceCapacity: string;
  totalLeavesAllocated: string;
  otherAllowances: string;
}

export interface ApplicationFormLoginDetails {
  employeeCode: string;
  employeeName: string;
  userId: string;
  password: string;
}

export interface ApplicationFormAttachmentMeta {
  type: string;
  fileName: string;
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

export interface ApplicationFormDetail {
  personalInfo: ApplicationFormPersonalInfo;
  education: ApplicationFormEducationRow[];
  pastExperience: ApplicationFormPastExperienceRow[];
  remuneration: ApplicationFormRemuneration;
  loginDetails: ApplicationFormLoginDetails;
  attachments: ApplicationFormAttachmentMeta[];
  requisition: ApplicationFormRequisition;
}

export interface ApplicationFormRecord {
  EmployeeCode: number;
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

export interface EmployeeProfileAddPayload {
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
  roleAndSalary: string;
  educationSections: ApplicationFormEducationRow[];
  pastExperienceSections: Array<{
    company: string;
    fromDate: string;
    toDate: string;
    remarks: string;
    position: string;
    duties: string;
    lastSalary: number;
  }>;
  attachments: Array<{
    type: string;
    fileName: string;
    file: string;
  }>;
  basicSalary: string;
  medicalAllowances: string;
  fuelAllowances: string;
  mobileAllowances: string;
  carAllowances: string;
  maximumLoanCapacity: string;
  maximumAdvanceCapacity: string;
  totalLeavesAllocated: string;
  otherAllowances: string;
  employeeCode: string;
  userId: string;
  loginEmployeeName: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationFormService {
  private readonly http = inject(HttpClient);
  private readonly applicationRecords = signal<ApplicationFormRecord[]>([]);

  getApplicationRecords(): ApplicationFormRecord[] {
    return this.applicationRecords();
  }

  getNextEmployeeCode(): number {
    const records = this.applicationRecords();
    if (records.length === 0) {
      return 1;
    }
    return Math.max(...records.map((r) => r.EmployeeCode)) + 1;
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

  private extractApiSingle(response: unknown): Record<string, unknown> | null {
    if (!response || typeof response !== 'object') {
      return null;
    }
    if (Array.isArray(response)) {
      const first = response[0];
      return first && typeof first === 'object' ? (first as Record<string, unknown>) : null;
    }
    const obj = response as Record<string, unknown>;
    const nested = obj['data'] ?? obj['employee'] ?? obj['profile'] ?? obj['user'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
    if (
      obj['personName'] ||
      obj['person_name'] ||
      obj['employeeCode'] ||
      obj['employee_code'] ||
      obj['id']
    ) {
      return obj;
    }
    return null;
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

  private mapApiItemToRecord(item: Record<string, unknown>): ApplicationFormRecord {
    const asString = (value: unknown): string =>
      value === undefined || value === null ? '' : String(value).trim();
    const asNumber = (value: unknown, fallback: number): number => {
      const parsed = Number.parseInt(asString(value), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const employeeCode = asString(item['employeeCode']) || asString(item['employee_code']) || asString(item['id']);
    const personName = asString(item['personName']) || asString(item['person_name']);
    const composedName = [asString(item['firstName']), asString(item['middleName']), asString(item['lastName'])]
      .filter(Boolean)
      .join(' ');
    const loginEmployeeName =
      asString(item['loginEmployeeName']) || asString(item['login_employee_name']);
    const employeeName = personName || composedName || loginEmployeeName;

    const apiId = asString(item['id']) || employeeCode;

    return {
      EmployeeCode: asNumber(employeeCode, 0),
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
      ReportingManager: asString(item['reportingManager']) || asString(item['reporting_manager']) || '—',
      EmploymentType: asString(item['employmentType']) || asString(item['employment_type']) || '—',
      EmploymentCategory:
        asString(item['employmentCategory']) ||
        asString(item['employment_category']) ||
        '—',
      status:
        asString(item['employmentStatus']) ||
        asString(item['employment_status']) ||
        asString(item['status']) ||
        'Active',
      selected: false,
      apiId: apiId || undefined,
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

    const education = Array.isArray(educationRaw)
      ? educationRaw
          .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
          .map((row) => ({
            institute: pickFrom(row, 'institute'),
            fromDate: pickFrom(row, 'fromDate', 'from_date'),
            toDate: pickFrom(row, 'toDate', 'to_date'),
            subject: pickFrom(row, 'subject'),
            qualification: pickFrom(row, 'qualification'),
            awardedQualification: pickFrom(row, 'awardedQualification', 'awarded_qualification'),
            marksGrades: pickFrom(row, 'marksGrades', 'marks_grades'),
            notes: pickFrom(row, 'notes'),
          }))
      : [];

    const pastExperience = Array.isArray(experienceRaw)
      ? experienceRaw
          .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
          .map((row) => ({
            company: pickFrom(row, 'company'),
            position: pickFrom(row, 'position'),
            fromDate: pickFrom(row, 'fromDate', 'from_date'),
            toDate: pickFrom(row, 'toDate', 'to_date'),
            duties: pickFrom(row, 'duties'),
            remarks: pickFrom(row, 'remarks'),
            lastSalary: asString(row['lastSalary'] ?? row['last_salary']),
          }))
      : [];

    const attachments = Array.isArray(attachmentsRaw)
      ? attachmentsRaw
          .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
          .map((row) => ({
            type: pickFrom(row, 'type'),
            fileName: pickFrom(row, 'fileName', 'file_name') || pickFrom(row, 'file'),
          }))
      : [];

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
        employmentCategory: pick('employmentCategory', 'employment_category'),
        employmentStatus: pick('employmentStatus', 'employment_status'),
        departmentInAhcp: pick('departmentInAhcp', 'department_in_ahcp') || pick('department'),
        designation: pick('designation'),
        jobDescription: pick('jobDescription', 'job_description'),
        roleAndSalary: pick('roleAndSalary', 'role_and_salary'),
      },
      education,
      pastExperience,
      remuneration: {
        basicSalary: pick('basicSalary', 'basic_salary'),
        medicalAllowances: pick('medicalAllowances', 'medical_allowances'),
        fuelAllowances: pick('fuelAllowances', 'fuel_allowances'),
        mobileAllowances: pick('mobileAllowances', 'mobile_allowances'),
        carAllowances: pick('carAllowances', 'car_allowances'),
        maximumLoanCapacity: pick('maximumLoanCapacity', 'maximum_loan_capacity'),
        maximumAdvanceCapacity: pick('maximumAdvanceCapacity', 'maximum_advance_capacity'),
        totalLeavesAllocated: pick('totalLeavesAllocated', 'total_leaves_allocated'),
        otherAllowances: pick('otherAllowances', 'other_allowances'),
      },
      loginDetails: {
        employeeCode: pick('employeeCode', 'employee_code'),
        employeeName: pick('loginEmployeeName', 'login_employee_name'),
        userId: pick('userId', 'user_id'),
        password: pick('password'),
      },
      attachments,
      requisition: {
        copyExisting: false,
        reqId: '',
        internalJobTitle: summary.Designation !== '—' ? summary.Designation : '',
        hiringManager: summary.ReportingManager !== '—' ? summary.ReportingManager : '',
        recruiter: '',
        recruitmentCollaborator: '',
        requisitionAdministrator: '',
        recruitmentCoordinator: '',
        hrAdministrator: '',
        company: summary.EmployeeNature !== '—' ? summary.EmployeeNature : '',
        department: summary.Department !== '—' ? summary.Department : '',
        division: summary.EmploymentType !== '—' ? summary.EmploymentType : '',
        location: '',
        costCenter: summary.EmploymentCategory !== '—' ? summary.EmploymentCategory : '',
      },
    };

    return {
      ...summary,
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

  /** Profile for the signed-in user; falls back to the first application record. */
  getSignedInUserRecord(sessionUserId: string | null): ApplicationFormRecord | undefined {
    if (sessionUserId) {
      const match = this.findRecordByLoginUserId(sessionUserId);
      if (match) {
        return match;
      }
    }
    const records = this.applicationRecords();
    return records.length > 0 ? records[0] : undefined;
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
      EmployeeID: record.EmployeeCode,
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
