import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface KpiSetupRecord {
  id: string | number;
  department: string;
  work_level: string;
  designation: string;
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
    console.log('🔍 Fetching KPI detail for ID:', identifier);
    return this.http.get<unknown>(apiUrl(`kpi-detail/${identifier}`)).pipe(
      map((response) => {
        console.log('📡 Raw API response for kpi-detail:', response);
        console.log('📡 Response type:', typeof response);
        console.log('📡 Is Array?:', Array.isArray(response));
        if (response && typeof response === 'object') {
          console.log('📡 Response keys:', Object.keys(response as Record<string, unknown>));
        }
        
        const items = this.extractApiItems(response);
        console.log('📡 Extracted items:', items);
        
        if (items.length > 0) {
          const mapped = this.mapRecord(items[0]);
          console.log('✅ Mapped record from array:', mapped);
          return mapped;
        }
        if (response && typeof response === 'object') {
          const mapped = this.mapRecord(response as Record<string, unknown>);
          console.log('✅ Mapped record from object:', mapped);
          return mapped;
        }
        console.warn('⚠️ Empty response, returning minimal record');
        return this.mapRecord({ id });
      }),
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
    const work_level = this.pickString(item, ['work_level', 'workLevel', 'WorkLevel', 'level', 'Level']) || '';
    const designation = this.pickString(item, ['designation', 'Designation', 'role', 'Role', 'job_title', 'jobTitle']) || '';
    
    console.log('📋 Mapped fields:', { id, department, work_level, designation });
    
    return {
      ...item,
      id,
      department,
      work_level,
      designation,
    };
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
