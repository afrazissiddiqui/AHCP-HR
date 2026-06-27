import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface JobSpecificationRecord {
  Id: number;
  jobTitle: string;
  department: string;
  vacancyCount: number;
  jobDescription: string;
  experienceRequirement: string;
  employmentCategory: string;
  employmentNature: string;
  employmentType: string;
  gradeWorkLevel: string;
  keyResponsibilities: string;
  basicSalary: number;
  medicalAllowance: number;
  fuelAllowance: number;
  packagePerks: string;
  qualifications: string[];
  selected?: boolean;
}

const JOB_SPECIFICATION_LIST_URL = apiUrl('job-specification-list');
const JOB_SPECIFICATION_ADD_URL = apiUrl('job-specification-add');
const JOB_SPECIFICATION_UPDATE_URL = apiUrl('job-specification-update');
const JOB_SPECIFICATION_DELETE_URL = apiUrl('job-specification-delete');

export interface JobSpecificationAddPayload {
  jobTitle: string;
  department: string;
  vacancyCount: number;
  jobDescription: string;
  experienceRequirement: string;
  employmentCategory: string;
  employmentNature: string;
  employmentType: string;
  gradeWorkLevel: string;
  keyResponsibilities: string;
  basicSalary: number;
  medicalAllowance: number;
  fuelAllowance: number;
  packagePerks: string;
  qualifications: string[];
}

@Injectable({
  providedIn: 'root'
})
export class JobSpecificationService {
  private readonly http = inject(HttpClient);
  private readonly jobSpecsList = signal<JobSpecificationRecord[]>([]);

  readonly jobSpecs = this.jobSpecsList.asReadonly();

  fetchPostedJobSpecifications(): Observable<JobSpecificationRecord[]> {
    return this.fetchJobSpecificationsByStatus(2);
  }

  fetchJobSpecificationsByStatus(status?: number): Observable<JobSpecificationRecord[]> {
    const params =
      status !== undefined ? new HttpParams().set('status', String(status)) : undefined;
    return this.http.get<unknown>(JOB_SPECIFICATION_LIST_URL, { params }).pipe(
      map((response) => this.normalizeJobSpecRecords(
        this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item)),
      )),
      tap((records) => {
        this.jobSpecsList.set(records);
      }),
    );
  }

  /** Posted job specs (status=2) for application form; falls back to full list when empty. */
  fetchJobSpecificationsForApplication(): Observable<JobSpecificationRecord[]> {
    return this.fetchJobSpecificationsByStatus(2).pipe(
      switchMap((posted) =>
        posted.length > 0 ? of(posted) : this.fetchJobSpecificationsByStatus(),
      ),
      catchError(() => this.fetchJobSpecificationsByStatus()),
      map((records) => this.normalizeJobSpecRecords(records)),
    );
  }

  private normalizeJobSpecRecords(records: JobSpecificationRecord[]): JobSpecificationRecord[] {
    return records
      .filter((record) => this.hasJobSpecDisplayValue(record))
      .map((record, index) => ({
        ...record,
        Id: record.Id > 0 ? record.Id : index + 1,
      }));
  }

  private hasJobSpecDisplayValue(record: JobSpecificationRecord): boolean {
    return !!(
      this.cleanRecordValue(record.jobTitle) ||
      this.cleanRecordValue(record.jobDescription) ||
      this.cleanRecordValue(record.keyResponsibilities) ||
      this.cleanRecordValue(record.department)
    );
  }

  private cleanRecordValue(value: string): string {
    return value === '—' ? '' : value.trim();
  }

  addJobSpec(payload: JobSpecificationAddPayload): Observable<unknown> {
    return this.http.post(JOB_SPECIFICATION_ADD_URL, payload);
  }

  updateJobSpec(id: string | number, payload: JobSpecificationAddPayload): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post(`${JOB_SPECIFICATION_UPDATE_URL}/${identifier}`, payload);
  }

  findJobSpecById(id: string | number): JobSpecificationRecord | undefined {
    const numericId = Number.parseInt(String(id), 10);
    return this.jobSpecsList().find((item) => item.Id === numericId);
  }

  deleteJobSpec(id: string | number): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete(`${JOB_SPECIFICATION_DELETE_URL}/${identifier}`);
  }

  removeJobSpecRecord(record: JobSpecificationRecord): void {
    this.jobSpecsList.update((list) => list.filter((item) => item.Id !== record.Id));
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
      'Data',
      'items',
      'Items',
      'results',
      'Results',
      'records',
      'Records',
      'list',
      'List',
      'rows',
      'Rows',
      'content',
      'Content',
      'values',
      'Values',
      'jobSpecifications',
      'job_specifications',
      'job_specification_list',
      'jobSpecificationList',
    ];

    for (const key of arrayKeys) {
      const value = obj[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      }
    }

    const nestedData = obj['data'] ?? obj['Data'] ?? obj['result'] ?? obj['Result'];
    if (nestedData && typeof nestedData === 'object') {
      const nestedItems = this.extractApiItems(nestedData);
      if (nestedItems.length > 0) {
        return nestedItems;
      }
    }

    if (
      obj['jobTitle'] ||
      obj['job_title'] ||
      obj['JobTitle'] ||
      obj['department'] ||
      obj['Department']
    ) {
      return [obj];
    }

    return [];
  }

  private mapApiItemToRecord(item: Record<string, unknown>): JobSpecificationRecord {
    const asString = (value: unknown): string =>
      value === undefined || value === null ? '' : String(value).trim();
    const asNumber = (value: unknown, fallback: number): number => {
      const parsed = Number.parseInt(asString(value), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const asStringArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.map((entry) => asString(entry)).filter(Boolean);
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed) as unknown;
            if (Array.isArray(parsed)) {
              return parsed.map((entry) => asString(entry)).filter(Boolean);
            }
          } catch {
            // Fall through to comma-separated parsing.
          }
        }
        return trimmed
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      return [];
    };

    const asFloat = (value: unknown, fallback = 0): number => {
      const parsed = Number.parseFloat(asString(value));
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const id =
      asString(item['id']) ||
      asString(item['Id']) ||
      asString(item['ID']) ||
      asString(item['jobId']) ||
      asString(item['job_id']) ||
      asString(item['job_specification_id']) ||
      asString(item['jobSpecificationId']) ||
      asString(item['specificationId']) ||
      asString(item['specification_id']);

    return {
      Id: asNumber(id, 0),
      jobTitle:
        asString(item['jobTitle']) ||
        asString(item['job_title']) ||
        asString(item['JobTitle']) ||
        asString(item['title']) ||
        asString(item['Title']) ||
        '—',
      department: asString(item['department']) || asString(item['Department']) || '—',
      vacancyCount: asNumber(item['vacancyCount'] ?? item['vacancy_count'] ?? item['vacancy'], 0),
      jobDescription:
        asString(item['jobDescription']) ||
        asString(item['job_description']) ||
        asString(item['JobDescription']) ||
        asString(item['description']) ||
        asString(item['Description']) ||
        '—',
      experienceRequirement:
        asString(item['experienceRequirement']) ||
        asString(item['experience_requirement']) ||
        asString(item['ExperienceRequirement']) ||
        asString(item['experience']) ||
        '—',
      employmentCategory:
        asString(item['employmentCategory']) ||
        asString(item['employment_category']) ||
        asString(item['EmploymentCategory']) ||
        asString(item['category']) ||
        '—',
      employmentNature:
        asString(item['employmentNature']) ||
        asString(item['employment_nature']) ||
        asString(item['EmploymentNature']) ||
        asString(item['nature']) ||
        '—',
      employmentType:
        asString(item['employmentType']) ||
        asString(item['employment_type']) ||
        asString(item['EmploymentType']) ||
        asString(item['type']) ||
        '—',
      gradeWorkLevel:
        asString(item['gradeWorkLevel']) ||
        asString(item['grade_work_level']) ||
        asString(item['GradeWorkLevel']) ||
        asString(item['grade']) ||
        '—',
      keyResponsibilities:
        asString(item['keyResponsibilities']) ||
        asString(item['key_responsibilities']) ||
        asString(item['KeyResponsibilities']) ||
        asString(item['responsibilities']) ||
        '—',
      basicSalary: asFloat(item['basicSalary'] ?? item['basic_salary'] ?? item['BasicSalary']),
      medicalAllowance: asFloat(item['medicalAllowance'] ?? item['medical_allowance'] ?? item['MedicalAllowance']),
      fuelAllowance: asFloat(item['fuelAllowance'] ?? item['fuel_allowance'] ?? item['FuelAllowance']),
      packagePerks:
        asString(item['packagePerks']) ||
        asString(item['package_perks']) ||
        asString(item['PackagePerks']) ||
        '—',
      qualifications: asStringArray(item['qualifications'] ?? item['Qualifications']),
      selected: false,
    };
  }
}
