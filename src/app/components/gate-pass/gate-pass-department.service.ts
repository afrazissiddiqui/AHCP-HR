import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { apiUrl } from '../../config/api.config';

export interface GatePassDepartment {
  id: string;
  name: string;
}

const DEPARTMENTS_URL = apiUrl('departments');

@Injectable({ providedIn: 'root' })
export class GatePassDepartmentService {
  private readonly http = inject(HttpClient);
  private readonly departmentsSignal = signal<GatePassDepartment[]>([]);
  private loaded = false;
  private loading = false;
  private load$?: Observable<GatePassDepartment[]>;

  readonly departments = this.departmentsSignal.asReadonly();

  ensureLoaded(): Observable<GatePassDepartment[]> {
    if (this.loaded) {
      return of(this.departmentsSignal());
    }

    if (!this.load$) {
      this.loading = true;
      this.load$ = this.http.get<unknown>(DEPARTMENTS_URL).pipe(
        map((response) =>
          this.extractApiItems(response)
            .map((item) => this.mapDepartment(item))
            .filter((dept) => !!dept.name)
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
        ),
        tap((records) => {
          this.departmentsSignal.set(records);
          this.loaded = true;
          this.loading = false;
        }),
        catchError(() => {
          this.departmentsSignal.set([]);
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

  departmentNames(): string[] {
    return this.departmentsSignal().map((dept) => dept.name);
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
    const arrayKeys = ['data', 'items', 'results', 'records', 'list', 'departments', 'Departments'];

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

    if (obj['name'] || obj['Name'] || obj['department'] || obj['Department'] || obj['id'] || obj['Id']) {
      return [obj];
    }

    return [];
  }

  private mapDepartment(item: Record<string, unknown>): GatePassDepartment {
    const name = this.pickString(item, [
      'name',
      'Name',
      'department',
      'Department',
      'departmentName',
      'department_name',
      'DepartmentName',
      'title',
      'Title',
    ]);

    return {
      id: this.pickString(item, ['id', 'Id', 'ID', 'departmentId', 'department_id', 'code', 'Code']) || name,
      name,
    };
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return '';
  }
}
