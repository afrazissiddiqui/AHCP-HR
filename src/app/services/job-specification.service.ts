import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

export interface JobSpecificationRecord {
  Id: number;
  jobTitle: string;
  department: string;
  vacancy: number;
  employmentCategory: string;
  employmentNature: string;
  employmentType: string;
  gradeWorkLevel: string;
  jobDescription: string;
  experienceRequirement: string;
  selected?: boolean;
  keyResponsibilities?: string;
  basicSalary?: string;
  medicalAllowance?: string;
  fuelAllowance?: string;
  packagePerks?: string;
  qualifications?: string[];
}

const JOB_SPECIFICATION_LIST_URL = 'http://ahcp.hr:8080/api/job-specification-list';
const JOB_SPECIFICATION_ADD_URL = 'http://ahcp.hr:8080/api/job-specification-add';
const JOB_SPECIFICATION_UPDATE_URL = 'http://ahcp.hr:8080/api/job-specification-update';
const JOB_SPECIFICATION_DELETE_URL = 'http://ahcp.hr:8080/api/job-specification-delete';

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
    const params = new HttpParams().set('status', '2');
    return this.http.get<unknown>(JOB_SPECIFICATION_LIST_URL, { params }).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => this.jobSpecsList.set(records)),
    );
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
    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }

    if (response && typeof response === 'object') {
      const obj = response as Record<string, unknown>;
      const candidate = obj['data'] ?? obj['items'] ?? obj['jobSpecifications'] ?? obj['job_specifications'];
      if (Array.isArray(candidate)) {
        return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      }
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
        return value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      return [];
    };

    const id = asString(item['id']) || asString(item['Id']) || asString(item['jobId']) || asString(item['job_id']);

    return {
      Id: asNumber(id, 0),
      jobTitle: asString(item['jobTitle']) || asString(item['job_title']) || asString(item['title']) || '—',
      department: asString(item['department']) || '—',
      vacancy: asNumber(item['vacancyCount'] ?? item['vacancy'], 0),
      employmentCategory:
        asString(item['employmentCategory']) || asString(item['employment_category']) || asString(item['category']) || '—',
      employmentNature:
        asString(item['employmentNature']) || asString(item['employment_nature']) || asString(item['nature']) || '—',
      employmentType: asString(item['employmentType']) || asString(item['employment_type']) || asString(item['type']) || '—',
      gradeWorkLevel:
        asString(item['gradeWorkLevel']) || asString(item['grade_work_level']) || asString(item['grade']) || '—',
      jobDescription:
        asString(item['jobDescription']) || asString(item['job_description']) || asString(item['description']) || '—',
      experienceRequirement:
        asString(item['experienceRequirement']) || asString(item['experience_requirement']) || asString(item['experience']) || '—',
      keyResponsibilities:
        asString(item['keyResponsibilities']) || asString(item['key_responsibilities']) || asString(item['responsibilities']) || undefined,
      basicSalary: asString(item['basicSalary']) || asString(item['basic_salary']) || undefined,
      medicalAllowance: asString(item['medicalAllowance']) || asString(item['medical_allowance']) || undefined,
      fuelAllowance: asString(item['fuelAllowance']) || asString(item['fuel_allowance']) || undefined,
      packagePerks: asString(item['packagePerks']) || asString(item['package_perks']) || undefined,
      qualifications: asStringArray(item['qualifications']),
      selected: false,
    };
  }
}
