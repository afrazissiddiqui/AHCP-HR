import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface KpiSetupRecord {
  id: string | number;
  name: string;
  code: string;
  description: string;
  status: string;
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
      map((response) => this.extractApiItems(response).map((item) => this.mapRecord(item))),
      tap((records) => this.kpiListSignal.set(records)),
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
    const arrayKeys = ['data', 'items', 'results', 'records', 'list', 'kpis', 'kpiList', 'kpi_list'];

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
    return {
      ...item,
      id: this.pickString(item, ['id', 'Id', 'ID', 'kpi_id', 'KpiId']) || '',
      name: this.pickString(item, ['name', 'Name', 'kpiName', 'KPIName', 'KpiName', 'title']) || '',
      code: this.pickString(item, ['code', 'Code', 'kpiCode', 'KPICode', 'KpiCode']) || '',
      description: this.pickString(item, ['description', 'Description', 'details', 'detail']) || '',
      status: this.pickString(item, ['status', 'Status', 'active', 'isActive']) || '',
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
}
