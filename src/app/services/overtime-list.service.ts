import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ApplicationFormRecord, ApplicationFormService } from './application-form.service';

export interface OvertimeListRecord {
  id: string | number;
  employeeId: string;
  employeeName: string;
  department: string;
  branch: string;
  reportingManager: string;
  overtimeHours: number;
  overtimeRate: number;
  exceptionalOt: number;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class OvertimeListService {
  private readonly applicationFormService = inject(ApplicationFormService);
  private readonly overtimeListSignal = signal<OvertimeListRecord[]>([]);

  readonly overtimeList = this.overtimeListSignal.asReadonly();

  fetchOvertimeList(): Observable<OvertimeListRecord[]> {
    return this.applicationFormService.fetchEmployeeProfiles().pipe(
      map((records) => records.filter((record) => this.isOvertimeApplicable(record)).map((record) => this.mapEmployee(record))),
      tap((records) => this.overtimeListSignal.set(records)),
    );
  }

  private mapEmployee(record: ApplicationFormRecord): OvertimeListRecord {
    return {
      id: record.apiId || record.EmployeeCode,
      employeeId: record.EmployeeCode,
      employeeName: record.EmployeeName || record.detail?.personalInfo.personName || '',
      department: record.Department,
      branch: record.detail?.personalInfo.branchLocation ?? '',
      reportingManager: record.ReportingManager,
      overtimeHours: 0,
      overtimeRate: 0,
      exceptionalOt: 0,
    };
  }

  private isOvertimeApplicable(record: ApplicationFormRecord): boolean {
    return record.detail?.remuneration.overTimeApplicable.trim().toLowerCase() === 'yes';
  }
}
