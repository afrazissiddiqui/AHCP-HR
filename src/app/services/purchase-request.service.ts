import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface CreatePurchaseRequestLine {
  itemCode: string;
  infoPrice: number;
  quantity: number;
  discount: number;
  CardCode: string;
  CardName: string;
  warehouse: string;
  Code: string;
  Name: string;
  department: string;
  requiredDate: string;
  remarks: string;
}

export interface CreatePurchaseRequestPayload {
  employee_code: string;
  docDate: string;
  requiredDate: string;
  branch: string | number;
  remarks: string;
  items: CreatePurchaseRequestLine[];
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
}
