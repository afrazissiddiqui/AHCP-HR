import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface KpiSetupRecord {
  id: string | number;
  department: string;
  work_level: string;
  designation: string;
  employment_nature?: string;
  employment_category?: string;
  employment_status?: string;
  kpis?: Record<string, unknown>[];
  [key: string]: unknown;
}

const KPI_SETUP_LIST_URL = apiUrl('kpi-list');

@Injectable({
  providedIn: 'root',
})
export class KpiSetupService {
  private readonly http = inject(HttpClient);
  private readonly kpiListSignal = signal<KpiSetupRecord[]>([]);
  readonly kpis = this.kpiListSignal.asReadonly();

  fetchKpis(): Observable<KpiSetupRecord[]> {
    return this.http.get<unknown>(KPI_SETUP_LIST_URL).pipe(
      map((response) => {
        console.log('KPI API response:', response);
        const items = this.extractApiItems(response);
        console.log('Extracted items:', items);
        return items.map((item) => {
          const mapped = this.mapRecord(item);
          console.log('Mapped record:', mapped);
          return mapped;
        });
      }),
      tap((records) => this.kpiListSignal.set(records)),
    );
  }

  createKpi(payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(apiUrl('kpi-add'), payload);
  }

  fetchKpiDetail(id: string | number): Observable<KpiSetupRecord> {
    const identifier = encodeURIComponent(String(id));
    return this.http.get<unknown>(apiUrl(`kpi-detail/${identifier}`)).pipe(
      map((response) => this.mapRecord(this.extractDetailRecord(response, id))),
    );
  }

  updateKpi(id: string | number, payload: Record<string, unknown>): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post<unknown>(apiUrl(`kpi-update/${identifier}`), payload);
  }

  deleteKpi(id: string | number): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete<unknown>(apiUrl(`kpi-delete/${identifier}`));
  }

  private extractDetailRecord(response: unknown, id: string | number): Record<string, unknown> {
    if (!response || typeof response !== 'object') {
      return { id };
    }

    if (Array.isArray(response)) {
      const first = response.find((item) => !!item && typeof item === 'object');
      return (first as Record<string, unknown> | undefined) ?? { id };
    }

    const obj = response as Record<string, unknown>;
    const wrapperKeys = ['data', 'item', 'record', 'result', 'kpi', 'kpi_detail', 'kpiDetail'];

    for (const key of wrapperKeys) {
      const value = obj[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    }

    return obj;
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
    // Include more common response wrappers
    const arrayKeys = ['data', 'items', 'results', 'records', 'list', 'kpis', 'kpiList', 'kpi_list', 'kpi', 'response', 'payload'];

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

  private mapRecord(item: Record<string, unknown>): KpiSetupRecord {
    console.log('Raw item from API:', item);
    console.log('Available keys:', Object.keys(item));
    
    const id = this.pickString(item, ['id', 'Id', 'ID', 'kpi_id', 'KpiId', 'kpiId', 'kpi_ID']) || '';
    const department = this.pickString(item, ['department', 'Department', 'dept', 'Dept']) || '';
    const work_level = this.pickString(item, ['work_level', 'Work_Level', 'workLevel', 'WorkLevel', 'level', 'Level']) || '';
    const designation = this.pickString(item, ['designation', 'Designation', 'role', 'Role', 'job_title', 'jobTitle']) || '';
    const employment_nature = this.pickString(item, ['employment_nature', 'Employment_Nature', 'Employement_Nature', 'employmentNature']) || '';
    const employment_category = this.pickString(item, ['employment_category', 'Employment_Category', 'Employement_Category', 'employmentCategory']) || '';
    const employment_status = this.pickString(item, ['employment_status', 'Employment_Status', 'Employement_Status', 'employmentStatus']) || '';
    const kpis = this.extractNestedRows(item);
    
    console.log('📋 Mapped fields:', { id, department, work_level, designation, kpisCount: kpis.length });
    
    return {
      ...item,
      id,
      department,
      work_level,
      designation,
      employment_nature,
      employment_category,
      employment_status,
      kpis,
    };
  }

  private extractNestedRows(source: Record<string, unknown>): Record<string, unknown>[] {
    const arrayKeys = ['kpis', 'kpi_rows', 'kpiRows', 'kpi_list', 'kpiList', 'details', 'kpi_details', 'kpiDetails', 'items'];

    for (const key of arrayKeys) {
      const value = source[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      }
    }

    const nestedKeys = ['data', 'result', 'record', 'payload', 'response'];
    for (const key of nestedKeys) {
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const rows = this.extractNestedRows(value as Record<string, unknown>);
        if (rows.length > 0) {
          return rows;
        }
      }
    }

    return [];
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string {
    // First try exact matches
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
    
    // If no exact match, try case-insensitive match
    const lowerKeys = keys.map(k => k.toLowerCase());
    for (const [sourceKey, sourceValue] of Object.entries(source)) {
      if (lowerKeys.includes(sourceKey.toLowerCase())) {
        if (sourceValue === null || sourceValue === undefined) {
          continue;
        }
        const text = String(sourceValue).trim();
        if (text) {
          return text;
        }
      }
    }
    
    return '';
  }
}
