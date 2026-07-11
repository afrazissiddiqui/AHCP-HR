export interface OitmItem {
  itemCode: string;
  itemName: string;
  itemType?: string;
  uom: string;
  availableQty?: string | number;
  batches?: OitmBatch[];
}

export interface OitmBatch {
  batchNumber: string;
  warehouse: string;
  quantity?: string | number;
  manufacturingDate?: string;
  expiryDate?: string;
}
