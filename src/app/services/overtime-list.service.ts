import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface OvertimeListRecord {
  id: string | number;
  employeeId: string;
  employeeName: string;
  overtimeHours: number;
  overtimeRate: number;
  overtimeAmount: number;
  reportingManager: string;
  status: string;
  [key: string]: unknown;
}

const OVERTIME_LIST_URL = apiUrl('overtime-list');

@Injectable({
  providedIn: 'root',
})
export class OvertimeListService {
  private readonly http = inject(HttpClient);
  private readonly overtimeListSignal = signal<OvertimeListRecord[]>([]);

  readonly overtimeList = this.overtimeListSignal.asReadonly();

  fetchOvertimeList(): Observable<OvertimeListRecord[]> {
    return this.http.get<unknown>(OVERTIME_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapRecord(item))),
      tap((records) => this.overtimeListSignal.set(records)),
    );
  }

  private extractApiItems(response: unknown): Record<string, unknown>[] {
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
    const arrayKeys = ['data', 'items', 'results', 'records', 'list', 'overtimeList', 'overtime_list'];

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

    return [obj];
  }

  private mapRecord(item: Record<string, unknown>): OvertimeListRecord {
    const overtimeHours = this.pickAmount(item, ['overtimeHours', 'overtime_hours', 'OvertimeHours', 'over_time_hours']);
    const overtimeRate = this.pickAmount(item, ['overtimeRate', 'overtime_rate', 'OvertimeRate', 'over_time_rate']);
    const overtimeAmount = this.pickAmount(item, [
      'overtimeAmount',
      'overtime_amount',
      'OvertimeAmount',
      'over_time_amount',
      'overtime',
      'Overtime',
    ]);

    return {
      ...item,
      id: this.pickString(item, ['id', 'Id', 'ID', 'overtime_id']) || '',
      employeeId: this.pickString(item, ['employeeId', 'employee_id', 'EmployeeId', 'Employee ID']),
      employeeName: this.pickString(item, [
        'employeeName',
        'employee_name',
        'EmployeeName',
        'personName',
        'person_name',
        'PersonName',
      ]),
      overtimeHours,
      overtimeRate,
      overtimeAmount: overtimeAmount || overtimeRate * overtimeHours,
      reportingManager: this.pickString(item, [
        'reportingManager',
        'reporting_manager',
        'ReportingManager',
        'managerName',
        'manager_name',
      ]),
      status: this.pickString(item, ['status', 'Status']),
    };
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (value === null || value === undefined) {
        continue;
      }
      const text = String(value).trim();
      if (text) {
        return text;
      }
    }
    return '';
  }

  private pickAmount(source: Record<string, unknown>, keys: string[]): number {
    for (const key of keys) {
      const value = source[key];
      if (value === null || value === undefined || value === '') {
        continue;
      }
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return 0;
  }
}
