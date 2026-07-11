import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { IgpRecord as GatePassIgpRecord, IgpService } from '../components/gate-pass/igp/igp.service';

export interface IgpLineItem {
  itemCode: string;
  item: string;
  qty: string;
  uom: string;
}

export interface IgpRecord {
  igpNo: string;
  bpCode: string;
  bpName: string;
  receivingDate: string;
  receivingTime: string;
  items: IgpLineItem[];
}

@Injectable({
  providedIn: 'root',
})
export class IgpRecordService {
  private readonly igpService = inject(IgpService);

  getList(): Observable<IgpRecord[]> {
    return this.igpService.fetchInwardGatePasses().pipe(
      map((records) => records.map((record) => this.mapRecord(record))),
    );
  }

  private mapRecord(record: GatePassIgpRecord): IgpRecord {
    return {
      igpNo: record.referenceNo,
      bpCode: record.businessPartnerCode,
      bpName: record.businessPartnerName,
      receivingDate: record.submittedDate === '—' ? '' : record.submittedDate,
      receivingTime: '',
      items: (record.lines ?? []).map((line) => ({
        itemCode: line.itemCode,
        item: line.itemName,
        qty: String(line.qty ?? ''),
        uom: line.uom,
      })),
    };
  }
}
