import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface LeaveApplicationRecord {
  EmployeeCode?: number;
  EmployeeName?: string;
  LeaveType?: string;
  FromDate?: string;
  ToDate?: string;
  Department?: string;
  Designation?: string;
  ApprovedBy?: string;
  Status?: string;
  selected?: boolean;
  /** Backend record id for view/detail API */
  apiId?: string;
}

const LEAVE_APPLICATION_LIST_URL = apiUrl('leave-application-list');
const LEAVE_APPLICATION_VIEW_URL = apiUrl('leave-application-detail');
const LEAVE_APPLICATION_ADD_URL = apiUrl('leave-application-add');
const LEAVE_APPLICATION_UPDATE_URL = apiUrl('leave-application-update');
const LEAVE_APPLICATION_DELETE_URL = apiUrl('leave-application-delete');

export interface LeaveApplicationHeaderInfo {
  formNumber: string;
  employeeId: string;
  employeeName: string;
  employeeCategory: string;
  employmentNature: string;
  employmentType: string;
  workGradeLevel: string;
  department: string;
  jobTitle: string;
  location: string;
}

export interface LeaveApplicationRequest {
  requestDate: string;
  leaveType: string;
  causeOfLeave: string;
  fromDate: string;
  toDate: string;
  totalLeaveDaysRequested: number;
  requestStatus: string;
  remarks?: string;
}

export interface LeaveBalanceInformation {
  totalLeaves: number;
  leavesAvailed: number;
  remainingLeaves: number;
}

export interface LeaveApplicationAddPayload {
  headerInfo: LeaveApplicationHeaderInfo;
  leaveRequest: LeaveApplicationRequest;
  leaveBalanceInformation: LeaveBalanceInformation;
}

@Injectable({
  providedIn: 'root'
})
export class LeaveApplicationService {
  private readonly http = inject(HttpClient);
  private readonly leaveRecords = signal<LeaveApplicationRecord[]>([]);

  getLeaveRecords(): LeaveApplicationRecord[] {
    return this.leaveRecords();
  }

  addLeaveRecord(record: LeaveApplicationRecord): void {
    this.leaveRecords.update((list) => [...list, record]);
  }

  removeLeaveRecord(record: LeaveApplicationRecord): void {
    this.leaveRecords.update((list) =>
      list.filter((item) =>
        record.apiId
          ? item.apiId !== record.apiId
          : item.EmployeeCode !== record.EmployeeCode,
      ),
    );
  }

  addLeaveApplication(payload: LeaveApplicationAddPayload): Observable<unknown> {
    return this.http.post(LEAVE_APPLICATION_ADD_URL, payload);
  }

  updateLeaveApplication(id: string | number, payload: LeaveApplicationAddPayload): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post(`${LEAVE_APPLICATION_UPDATE_URL}/${identifier}`, payload);
  }

  deleteLeaveApplication(id: string | number): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete(`${LEAVE_APPLICATION_DELETE_URL}/${identifier}`);
  }

  fetchLeaveApplications(): Observable<LeaveApplicationRecord[]> {
    return this.http.get<unknown>(LEAVE_APPLICATION_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => {
        this.leaveRecords.set(records);
      }),
    );
  }

  fetchLeaveApplicationDetail(id: string | number): Observable<LeaveApplicationRecord> {
    const identifier = encodeURIComponent(String(id));
    return this.http.get<unknown>(`${LEAVE_APPLICATION_VIEW_URL}/${identifier}`).pipe(
      map((response) => {
        const item = this.extractApiSingle(response);
        if (!item) {
          throw new Error('Leave application not found.');
        }
        return this.mapApiItemToRecord(item);
      }),
    );
  }

  private extractApiSingle(response: unknown): Record<string, unknown> | null {
    if (!response || typeof response !== 'object') {
      return null;
    }
    if (Array.isArray(response)) {
      const first = response[0];
      return first && typeof first === 'object' ? (first as Record<string, unknown>) : null;
    }
    const obj = response as Record<string, unknown>;
    const nested = obj['data'] ?? obj['leave'] ?? obj['application'] ?? obj['record'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
    if (
      obj['employeeName'] ||
      obj['employee_name'] ||
      obj['leaveType'] ||
      obj['leave_type'] ||
      obj['id']
    ) {
      return obj;
    }
    return null;
  }

  private extractApiItems(response: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }
    if (!response || typeof response !== 'object') {
      return [];
    }
    const obj = response as Record<string, unknown>;
    const items = obj['data'] ?? obj['items'] ?? obj['leaves'] ?? obj['applications'];
    if (Array.isArray(items)) {
      return items.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }
    return [];
  }

  private mapApiItemToRecord(item: Record<string, unknown>): LeaveApplicationRecord {
    return {
      EmployeeCode: this.getValue<number>(item, ['employeeCode', 'employee_code']),
      EmployeeName: this.getValue<string>(item, ['employeeName', 'employee_name']),
      LeaveType: this.getValue<string>(item, ['leaveType', 'leave_type']),
      FromDate: this.getValue<string>(item, ['fromDate', 'from_date']),
      ToDate: this.getValue<string>(item, ['toDate', 'to_date']),
      Department: this.getValue<string>(item, ['department']),
      Designation: this.getValue<string>(item, ['designation']),
      ApprovedBy: this.getValue<string>(item, ['approvedBy', 'approved_by']),
      Status: this.getValue<string>(item, ['status']),
      apiId: this.getValue<string>(item, ['id', 'apiId', 'api_id']),
    };
  }

  private getValue<T>(obj: Record<string, unknown>, keys: string[]): T | undefined {
    for (const key of keys) {
      if (key in obj) {
        const value = obj[key];
        return value as T;
      }
    }
    return undefined;
  }
}
