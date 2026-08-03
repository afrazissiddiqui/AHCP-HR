import { Injectable, signal } from '@angular/core';
import { createEmptyIgpLineItem, type IgpLineItem } from './igp.service';

@Injectable({ providedIn: 'root' })
export class IgpBulkImportService {
  private readonly pendingLinesSignal = signal<IgpLineItem[]>([]);

  readonly pendingLines = this.pendingLinesSignal.asReadonly();

  setPendingLines(lines: IgpLineItem[]): void {
    this.pendingLinesSignal.set(lines.map((line) => ({ ...line })));
  }

  consumePendingLines(): IgpLineItem[] {
    const lines = this.pendingLinesSignal();
    if (!lines.length) {
      return [];
    }

    const result = lines.map((line) => ({ ...line }));
    this.pendingLinesSignal.set([]);
    return result;
  }

  clearPendingLines(): void {
    this.pendingLinesSignal.set([]);
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
