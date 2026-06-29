import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { apiUrl } from '../../config/api.config';

export interface GatePassBusinessPartner {
  code: string;
  name: string;
}

const BUSINESS_PARTNERS_URL = apiUrl('business_partners');

@Injectable({ providedIn: 'root' })
export class GatePassBusinessPartnerService {
  private readonly http = inject(HttpClient);
  private readonly partners = signal<GatePassBusinessPartner[]>([]);
  private loaded = false;
  private loading = false;
  private load$?: Observable<GatePassBusinessPartner[]>;

  ensureLoaded(): Observable<GatePassBusinessPartner[]> {
    if (this.loaded) {
      return of(this.partners());
    }

    if (!this.load$) {
      this.loading = true;
      this.load$ = this.http.get<unknown>(BUSINESS_PARTNERS_URL).pipe(
        map((response) => this.extractApiItems(response).map((item) => this.mapPartner(item))),
        tap((records) => {
          this.partners.set(records);
          this.loaded = true;
          this.loading = false;
        }),
        catchError(() => {
          this.partners.set([]);
          this.loaded = true;
          this.loading = false;
          return of([]);
        }),
      );
    }

    return this.load$;
  }

  isLoading(): boolean {
    return this.loading;
  }

  search(query: string, limit = 8): GatePassBusinessPartner[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    return this.partners()
      .filter(
        (partner) =>
          partner.code.toLowerCase().includes(q) ||
          partner.name.toLowerCase().includes(q),
      )
      .slice(0, limit);
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
      'businessPartners',
      'business_partners',
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

    if (obj['code'] || obj['name'] || obj['businessPartnerCode'] || obj['business_partner_code']) {
      return [obj];
    }

    return [];
  }

  private mapPartner(item: Record<string, unknown>): GatePassBusinessPartner {
    return {
      code: this.pickString([item], [
        'code',
        'businessPartnerCode',
        'business_partner_code',
        'partnerCode',
        'partner_code',
        'CardCode',
      ]),
      name: this.pickString([item], [
        'name',
        'businessPartnerName',
        'business_partner_name',
        'partnerName',
        'partner_name',
        'CardName',
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
}
