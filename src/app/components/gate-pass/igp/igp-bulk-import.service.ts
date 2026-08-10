import { Injectable, signal } from '@angular/core';
import { createEmptyIgpLineItem, type IgpLineItem } from './igp.service';

export interface IgpBulkImportData {
  type?: string;
  baseDocNo?: string;
  poNumber?: string;
  businessPartnerName?: string;
  businessPartnerCode?: string;
  department?: string;
  vehicleNo?: string;
  location?: string;
  fromUnit?: string;
  kantaSlip?: string;
  biltyNo?: string;
  store?: string;
  driverName?: string;
  driverCnic?: string;
  driverPhone?: string;
  weight?: string;
  lines: IgpLineItem[];
}

@Injectable({ providedIn: 'root' })
export class IgpBulkImportService {
  private readonly pendingDataSignal = signal<IgpBulkImportData | null>(null);

  readonly pendingData = this.pendingDataSignal.asReadonly();

  setPendingData(data: IgpBulkImportData): void {
    this.pendingDataSignal.set({ ...data, lines: data.lines.map((line) => ({ ...line })) });
  }

  consumePendingData(): IgpBulkImportData | null {
    const data = this.pendingDataSignal();
    if (!data) {
      return null;
    }

    const result: IgpBulkImportData = {
      ...data,
      lines: data.lines.map((line) => ({ ...line })),
    };
    this.pendingDataSignal.set(null);
    return result;
  }

  clearPendingData(): void {
    this.pendingDataSignal.set(null);
  }

  createImportedLinesFromValues(values: Array<Partial<IgpLineItem>>): IgpLineItem[] {
    return values.map((value) => {
      const line = createEmptyIgpLineItem();
      line.itemCode = value.itemCode ?? '';
      line.itemName = value.itemName ?? '';
      line.serialNumbers = value.serialNumbers ?? '';
      line.category = value.category ?? '';
      line.packingCondition = value.packingCondition ?? '';
      line.productQuality = value.productQuality ?? '';
      line.uom = value.uom ?? '';
      line.qty = Number(value.qty) || 0;
      line.info = value.info ?? '';
      line.remarks = value.remarks ?? '';
      return line;
    });
  }
}
