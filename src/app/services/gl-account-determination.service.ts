import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface GlAccountDeterminationAddPayload {
  type: string;
  code: string;
  name: string;
  branch: string;
  debit_credit_type: string;
}

export interface GlAccountDeterminationRecord {
  Id: number;
  Type: string;
  Code: string;
  Name: string;
  Branch: string;
  DebitCreditType: string;
}

const GL_ACCOUNT_DETERMINATION_LIST_URL = apiUrl('gl-account-determination-list');
const GL_ACCOUNT_DETERMINATION_ADD_URL = apiUrl('gl-account-determination-add');
const GL_ACCOUNT_DETERMINATION_DELETE_URL = apiUrl('gl-account-determination-delete');

@Injectable({
  providedIn: 'root',
})
export class GlAccountDeterminationService {
  private readonly http = inject(HttpClient);
  private readonly recordList = signal<GlAccountDeterminationRecord[]>([]);

  readonly records = this.recordList.asReadonly();

  addGlAccountDetermination(payload: GlAccountDeterminationAddPayload): Observable<unknown> {
    return this.http.post(GL_ACCOUNT_DETERMINATION_ADD_URL, payload);
  }

  fetchGlAccountDeterminations(): Observable<GlAccountDeterminationRecord[]> {
    return this.http.get<unknown>(GL_ACCOUNT_DETERMINATION_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => this.recordList.set(records)),
    );
  }

  deleteGlAccountDetermination(id: string | number): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete(`${GL_ACCOUNT_DETERMINATION_DELETE_URL}/${identifier}`);
  }

  private extractApiItems(response: unknown): Array<Record<string, unknown>> {
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
    const arrayKeys = [
      'data',
      'items',
      'results',
      'records',
      'list',
      'glAccountDeterminations',
      'gl_account_determinations',
      'glAccountDeterminationList',
    ];

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

    if (obj['type'] || obj['code'] || obj['name'] || obj['branch'] || obj['debit_credit_type']) {
      return [obj];
    }

    return [];
  }

  private mapApiItemToRecord(item: Record<string, unknown>): GlAccountDeterminationRecord {
    const sources = [item];
    return {
      Id: this.pickNumber(sources, ['Id', 'id', 'ID']),
      Type: this.pickString(sources, ['Type', 'type', 'glItemType', 'gl_item_type']),
      Code: this.pickString(sources, ['Code', 'code', 'salaryGlAccountCode', 'salary_gl_account_code']),
      Name: this.pickString(sources, ['Name', 'name', 'salaryGlAccountName', 'salary_gl_account_name']),
      Branch: this.pickString(sources, ['Branch', 'branch']),
      DebitCreditType: this.pickString(sources, [
        'DebitCreditType',
        'debitCreditType',
        'debit_credit_type',
      ]),
    };
  }

  private pickString(sources: Array<Record<string, unknown>>, keys: string[]): string {
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value).trim();
        }
      }
    }
    return '';
  }

  private pickNumber(sources: Array<Record<string, unknown>>, keys: string[]): number {
    const text = this.pickString(sources, keys);
    return Number.parseInt(text, 10) || 0;
  }
}
