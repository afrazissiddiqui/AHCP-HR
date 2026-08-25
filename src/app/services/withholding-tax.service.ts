import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface WithholdingTaxAddPayload {
  lower_limit: number;
  upper_limit: number;
  tax_rate: number;
  amount: number;
  description: string;
  status: string;
}

export interface WithholdingTaxRecord extends WithholdingTaxAddPayload {
  id: number;
}
export function computeMonthlyWithholdingTax(
  grossSalary: number,
  brackets: readonly WithholdingTaxRecord[],
): number {
  const annualGrossSalary = grossSalary * 12;
  if (annualGrossSalary <= 0) {
    return 0;
  }

  const bracket = brackets.find(
    (item) => annualGrossSalary >= item.lower_limit && annualGrossSalary <= item.upper_limit,
  );
  if (!bracket) {
    return 0;
  }

  const taxableExcess = Math.max(0, annualGrossSalary - bracket.lower_limit);
  const annualTax = bracket.amount + taxableExcess * (bracket.tax_rate / 100);
  return Math.round((annualTax / 12) * 100) / 100;
}

const WITHHOLDING_TAX_ADD_URL = apiUrl('withholding-tax-add');
const WITHHOLDING_TAX_LIST_URL = apiUrl('withholding-tax-list');
const WITHHOLDING_TAX_DELETE_URL = apiUrl('withholding-tax-delete');

@Injectable({
  providedIn: 'root',
})
export class WithholdingTaxService {
  private readonly http = inject(HttpClient);

  addWithholdingTax(payload: WithholdingTaxAddPayload): Observable<unknown> {
    return this.http.post(WITHHOLDING_TAX_ADD_URL, payload);
  }

  deleteWithholdingTax(id: string | number): Observable<unknown> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete(`${WITHHOLDING_TAX_DELETE_URL}/${identifier}`);
  }

  fetchWithholdingTaxes(): Observable<WithholdingTaxRecord[]> {
    return this.http.get<unknown>(WITHHOLDING_TAX_LIST_URL).pipe(
      map((response) => this.extractItems(response).map((item) => this.mapItem(item))),
    );
  }

  private extractItems(response: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }
    if (!response || typeof response !== 'object') {
      return [];
    }

    const data = response as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'records', 'list', 'withholdingTaxes', 'withholding_tax']) {
      const value = data[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      }
    }
    return [];
  }

  private mapItem(item: Record<string, unknown>): WithholdingTaxRecord {
    return {
      id: this.pickNumber(item, ['id', 'Id', 'ID']),
      lower_limit: this.pickNumber(item, ['lower_limit', 'lowerLimit']),
      upper_limit: this.pickNumber(item, ['upper_limit', 'upperLimit']),
      tax_rate: this.pickNumber(item, ['tax_rate', 'taxRate', 'rate']),
      amount: this.pickNumber(item, ['amount']),
      description: this.pickString(item, ['description', 'Description']),
      status: this.pickString(item, ['status', 'Status']),
    };
  }

  private pickString(item: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      if (item[key] !== undefined && item[key] !== null) {
        return String(item[key]).trim();
      }
    }
    return '';
  }

  private pickNumber(item: Record<string, unknown>, keys: string[]): number {
    const value = Number(this.pickString(item, keys));
    return Number.isFinite(value) ? value : 0;
  }
}