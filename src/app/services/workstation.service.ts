import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface WorkstationRecord {
  id: string | number;
  name: string;
  code: string;
  officeInTime: string;
  officeOutTime: string;
  inGraceMinutes: number | string;
  outGraceMinutes: number | string;
  description: string;
  status: number | string;
  [key: string]: unknown;
}

export interface WorkstationPayload {
  id?: string | number;
  Id?: string | number;
  workstation_id?: string | number;
  name: string;
  code: string;
  office_in_time: string;
  office_out_time: string;
  in_grace_minutes: number;
  out_grace_minutes: number;
  description: string;
  status: number;
}

const WORKSTATION_LIST_URL = apiUrl('workstation-list');
const WORKSTATION_ADD_URL = apiUrl('workstation-add');
const WORKSTATION_UPDATE_URL = apiUrl('workstation-update');
const WORKSTATION_DETAIL_URL = apiUrl('workstation-detail');
const WORKSTATION_DELETE_URL = apiUrl('workstation-delete');

@Injectable({
  providedIn: 'root',
})
export class WorkstationService {
  private readonly http = inject(HttpClient);
  private readonly workstationSignal = signal<WorkstationRecord[]>([]);

  readonly workstations = this.workstationSignal.asReadonly();

  fetchWorkstations(): Observable<WorkstationRecord[]> {
    return this.http.get<unknown>(WORKSTATION_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapRecord(item))),
      tap((records) => this.workstationSignal.set(records)),
    );
  }

  fetchWorkstationDetail(id: string | number): Observable<WorkstationRecord> {
    const identifier = encodeURIComponent(String(id));
    return this.http.get<unknown>(`${WORKSTATION_DETAIL_URL}/${identifier}`).pipe(
      map((response) => {
        const items = this.extractApiItems(response);
        if (items.length > 0) {
          return this.mapRecord(items[0]);
        }
        if (response && typeof response === 'object') {
          return this.mapRecord(response as Record<string, unknown>);
        }
        return this.mapRecord({ id });
      }),
    );
  }

  addWorkstation(payload: WorkstationPayload): Observable<unknown> {
    return this.http.post(WORKSTATION_ADD_URL, payload);
  }

  updateWorkstation(payload: WorkstationPayload): Observable<unknown> {
    const identifier = payload.id ?? payload.Id ?? payload.workstation_id;
    return this.http.post(`${WORKSTATION_UPDATE_URL}/${encodeURIComponent(String(identifier))}`, {
      name: payload.name,
      code: payload.code,
      office_in_time: payload.office_in_time,
      office_out_time: payload.office_out_time,
      in_grace_minutes: payload.in_grace_minutes,
      out_grace_minutes: payload.out_grace_minutes,
      description: payload.description,
      status: payload.status,
    });
  }

  deleteWorkstation(id: string | number): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete(`${WORKSTATION_DELETE_URL}/${identifier}`);
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
    const arrayKeys = ['data', 'items', 'results', 'records', 'list', 'workstations', 'workstation_list'];

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

  private mapRecord(item: Record<string, unknown>): WorkstationRecord {
    return {
      ...item,
      id: this.pickString(item, ['id', 'Id', 'ID', 'workstation_id']) || '',
      name: this.pickString(item, ['name', 'Name', 'workstation_name']) || '',
      code: this.pickString(item, ['code', 'Code']) || '',
      officeInTime: this.pickString(item, ['office_in_time', 'officeInTime', 'in_time', 'start_time']) || '',
      officeOutTime: this.pickString(item, ['office_out_time', 'officeOutTime', 'out_time', 'end_time']) || '',
      inGraceMinutes:
        this.pickString(item, ['in_grace_minutes', 'inGraceMinutes', 'late_grace_minutes', 'grace_in']) || 0,
      outGraceMinutes:
        this.pickString(item, ['out_grace_minutes', 'outGraceMinutes', 'early_grace_minutes', 'grace_out']) || 0,
      description: this.pickString(item, ['description', 'Description', 'remarks', 'note']) || '',
      status: this.pickString(item, ['status', 'Status']) || 1,
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
