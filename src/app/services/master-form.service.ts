import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export type MasterFormRecord = Record<string, unknown>;

const MASTER_FORM_LIST_URL = apiUrl('master-form-list');
const MASTER_FORM_DETAIL_URL = apiUrl('master-form-detail');

@Injectable({
  providedIn: 'root',
})
export class MasterFormService {
  private readonly http = inject(HttpClient);
  private readonly masterFormsSignal = signal<MasterFormRecord[]>([]);

  readonly masterForms = this.masterFormsSignal.asReadonly();

  fetchMasterForms(): Observable<MasterFormRecord[]> {
    return this.http.get<unknown>(MASTER_FORM_LIST_URL).pipe(
      map((response) => this.extractApiItems(response)),
      tap((records) => this.masterFormsSignal.set(records)),
    );
  }

  fetchMasterFormDetail(id: string | number): Observable<MasterFormRecord> {
    const identifier = encodeURIComponent(String(id));
    return this.http.get<unknown>(`${MASTER_FORM_DETAIL_URL}/${identifier}`).pipe(
      map((response) => this.extractSingleRecord(response, id)),
    );
  }

  private extractSingleRecord(response: unknown, id: string | number): MasterFormRecord {
    if (!response || typeof response !== 'object') {
      return { id };
    }

    const obj = response as Record<string, unknown>;
    const nestedData = obj['data'];
    if (nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData)) {
      return nestedData as MasterFormRecord;
    }

    const items = this.extractApiItems(response);
    if (items.length > 0) {
      return items[0];
    }

    return obj;
  }

  private extractApiItems(response: unknown): MasterFormRecord[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response.filter((item): item is MasterFormRecord => !!item && typeof item === 'object');
    }

    if (typeof response !== 'object') {
      return [];
    }

    const obj = response as Record<string, unknown>;
    const arrayKeys = [
      'data',
      'items',
      'results',
      'records',
      'list',
      'masterForms',
      'master_forms',
      'masterFormList',
      'master_form_list',
    ];

    for (const key of arrayKeys) {
      const value = obj[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is MasterFormRecord => !!item && typeof item === 'object');
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
}
