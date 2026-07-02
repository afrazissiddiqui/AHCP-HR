import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface LeaveTypeRecord {
  id: string | number;
  name: string;
  code: string;
  description: string;
  status: number | string;
  [key: string]: unknown;
}

export interface LeaveTypePayload {
  id?: string | number;
  name: string;
  code: string;
  description: string;
  status: number;
}

const LEAVE_TYPE_LIST_URL = apiUrl('leave-type-list');
const LEAVE_TYPE_ADD_URL = apiUrl('leave-type-add');
const LEAVE_TYPE_DETAIL_URL = apiUrl('leave-type-detail');
const LEAVE_TYPE_DELETE_URL = apiUrl('user-delete');

@Injectable({
  providedIn: 'root',
})
export class LeaveTypeService {
  private readonly http = inject(HttpClient);
  private readonly leaveTypesSignal = signal<LeaveTypeRecord[]>([]);

  readonly leaveTypes = this.leaveTypesSignal.asReadonly();

  fetchLeaveTypes(): Observable<LeaveTypeRecord[]> {
    return this.http.get<unknown>(LEAVE_TYPE_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapRecord(item))),
      tap((records) => this.leaveTypesSignal.set(records)),
    );
  }

  fetchLeaveTypeDetail(id: string | number): Observable<LeaveTypeRecord> {
    const identifier = encodeURIComponent(String(id));
    return this.http.get<unknown>(`${LEAVE_TYPE_DETAIL_URL}/${identifier}`).pipe(
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

  addLeaveType(payload: LeaveTypePayload): Observable<unknown> {
    return this.http.post(LEAVE_TYPE_ADD_URL, payload);
  }

  updateLeaveType(payload: LeaveTypePayload): Observable<unknown> {
    return this.http.post(LEAVE_TYPE_ADD_URL, payload);
  }

  deleteLeaveType(id: string | number): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete(`${LEAVE_TYPE_DELETE_URL}/${identifier}`);
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
    const arrayKeys = ['data', 'items', 'results', 'records', 'list', 'leaveTypes', 'leave_types'];

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

  private mapRecord(item: Record<string, unknown>): LeaveTypeRecord {
    return {
      ...item,
      id: this.pickString(item, ['id', 'Id', 'ID', 'leave_type_id']) || '',
      name: this.pickString(item, ['name', 'Name']) || '',
      code: this.pickString(item, ['code', 'Code']) || '',
      description: this.pickString(item, ['description', 'Description']) || '',
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
