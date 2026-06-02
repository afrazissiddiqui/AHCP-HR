import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

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
  employeeMaster: string;
  salaryStructure: string;
  attendanceShiftManagement: string;
  leaveManagement: string;
  loanAdvancesForm: string;
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
  /** Populated when the record is saved from Create Application Form */
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

const EMPLOYEE_PROFILE_ADD_URL = 'http://ahcp.hr:8080/api/employee-profile-add';
const EMPLOYEE_PROFILE_LIST_URL = 'http://ahcp.hr:8080/api/employee-profile-list';

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
  employeeMaster: string;
  salaryStructure: string;
  attendanceShiftManagement: string;
  leaveManagement: string;
  loanAdvancesForm: string;
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

  addEmployeeProfile(payload: EmployeeProfileAddPayload): Observable<unknown> {
    return this.http.post(EMPLOYEE_PROFILE_ADD_URL, payload);
  }

  fetchEmployeeProfiles(): Observable<ApplicationFormRecord[]> {
    return this.http.get<unknown>(EMPLOYEE_PROFILE_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => {
        this.applicationRecords.set(records);
      }),
    );
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
    const employeeName =
      asString(item['loginEmployeeName']) ||
      asString(item['login_employee_name']) ||
      asString(item['personName']) ||
      asString(item['person_name']) ||
      `${asString(item['firstName'])} ${asString(item['lastName'])}`.trim();

    return {
      EmployeeCode: asNumber(employeeCode, 0),
      EmployeeName: employeeName || '—',
      Department: asString(item['department']) || '—',
      EmployeeNature: asString(item['employeeMaster']) || asString(item['employee_master']) || '—',
      Designation: asString(item['designation']) || '—',
      ReportingManager: asString(item['reportingManager']) || asString(item['reporting_manager']) || '—',
      EmploymentType: asString(item['employmentType']) || asString(item['employment_type']) || '—',
      EmploymentCategory: asString(item['employmentCategory']) || asString(item['employment_category']) || '—',
      status: asString(item['status']) || 'Active',
      selected: false,
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
