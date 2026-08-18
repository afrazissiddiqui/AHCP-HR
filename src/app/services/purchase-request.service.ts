import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { apiUrl } from '../config/api.config';

export interface CreatePurchaseRequestItemLine {
  itemCode: string;
  infoPrice: number;
  quantity: number;
  discount: number;
  Vendor?: string;
  CardCode?: string;
  CardName?: string;
  warehouse?: string;
  taxCode?: string;
  Code?: string;
  Name?: string;
  department: string;
  requiredDate: string;
  remarks: string;
}

export interface CreatePurchaseRequestServiceLine {
  Vendor: string;
  department: string;
  AccountCode: string;
  taxCode: string;
  requiredDate: string;
  total: number | string;
}

export type CreatePurchaseRequestLine = CreatePurchaseRequestItemLine | CreatePurchaseRequestServiceLine;

export interface CreatePurchaseRequestPayload {
  employee_code: string;
  docDate: string;
  DocType: 'item' | 'service';
  requiredDate: string;
  branch: string | number;
  remarks: string;
  items: CreatePurchaseRequestLine[];
}

export interface GlAccountAgainstDistributionOption {
  code: string;
  name: string;
}

export interface CreatePurchaseRequestResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  error?: string;
  error_code?: string | number;
  docEntry?: string | number;
  data?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class PurchaseRequestService {
  private readonly http = inject(HttpClient);

  create(payload: CreatePurchaseRequestPayload): Observable<CreatePurchaseRequestResponse> {
    return this.http.post<CreatePurchaseRequestResponse>(apiUrl('createPurchaseRequest'), payload);
  }

  /**
   * Fetch GL accounts for a given Cost Type (CCTypeCode).
   * 
   * Request payload: { U_CType: "COS" }
   * Expected response:
   * {
   *   "status": true,
   *   "count": 2,
   *   "data": [
   *     { "Code": "O12001000100010", "Name": "R&M - Buildings" },
   *     { "Code": "O12001002000010", "Name": "R&M - Furniture & Fixtures" }
   *   ]
   * }
   */
  getGlAccountsAgainstDistribution(ccTypeCode: string): Observable<GlAccountAgainstDistributionOption[]> {
    const normalized = ccTypeCode?.trim();
    if (!normalized) {
      console.log('GL Account API: No CCTypeCode provided');
      return of([]);
    }

    const payload = { U_CType: normalized };
    console.log('[GL-Account-API] Request:', { endpoint: 'get_gl_accounts_against_distribution', payload });

    return this.http
      .post<unknown>(apiUrl('get_gl_accounts_against_distribution'), payload)
      .pipe(
        map((response) => {
          console.log('[GL-API] Raw Response:', response);
          const parsed = this.parseGlAccounts(response);
          console.log('[GL-API] Final Parsed Accounts:', parsed);
          return parsed;
        }),
      );
  }

  private parseGlAccounts(response: unknown): GlAccountAgainstDistributionOption[] {
    if (!response || typeof response !== 'object') {
      return [];
    }

    const obj = response as Record<string, unknown>;

    // Check if response is a direct GL account entry (Code + Name)
    if (this.looksLikeGlAccountEntry(obj)) {
      const code = this.pickString(obj, ['Code', 'code']);
      const name = this.pickString(obj, ['Name', 'name']);
      if (code) {
        return [{ code, name: name || code }];
      }
    }

    // Search for arrays in nested properties (e.g., response.data)
    const arrays = this.collectNestedArrays(obj);

    for (const candidate of arrays) {
      const mapped = candidate.flatMap((entry: unknown): GlAccountAgainstDistributionOption[] => {
        if (!entry || typeof entry !== 'object') {
          return [];
        }

        const item = entry as Record<string, unknown>;
        if (!this.looksLikeGlAccountEntry(item)) {
          return [];
        }

        console.log('[GL] Response entry fields:', Object.keys(item));
        console.log('[GL] Response entry values:', item);
        console.log('[GL] Full response object:', JSON.stringify(item, null, 2));

        // Strictly pick "Code" field first, case variations, but NOT CardCode or AccountCode
        const code = this.pickString(item, ['Code', 'code']);
        const name = this.pickString(item, ['Name', 'name']);

        if (!code) {
          return [];
        }

        return [{ code, name: name || code }];
      });

      if (mapped.length > 0) {
        console.log('[GL-Accounts] Parsed:', mapped);
        return mapped;
      }
    }

    return [];
  }

  private looksLikeGlAccountEntry(value: Record<string, unknown>): boolean {
    return (
      !!value &&
      (this.pickString(value, ['Code', 'code']) !== '' ||
        this.pickString(value, ['Name', 'name']) !== '')
    );
  }

  private collectNestedArrays(value: unknown, result: unknown[][] = []): unknown[][] {
    if (!value || typeof value !== 'object') {
      return result;
    }

    const obj = value as Record<string, unknown>;

    for (const nestedValue of Object.values(obj)) {
      if (Array.isArray(nestedValue)) {
        result.push(nestedValue as unknown[]);
        for (const item of nestedValue) {
          this.collectNestedArrays(item, result);
        }
      } else if (nestedValue && typeof nestedValue === 'object') {
        this.collectNestedArrays(nestedValue, result);
      }
    }

    return result;
  }

  private pickString(item: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = item[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        const trimmed = String(value).trim();
        // Log which field was picked and its value
        console.log(`[GL] Field picked: "${key}" = "${trimmed}"`);
        return trimmed;
      }
    }
    return '';
  }
}
