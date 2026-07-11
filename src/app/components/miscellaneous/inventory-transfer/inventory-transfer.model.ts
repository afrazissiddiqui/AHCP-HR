export interface InventoryTransferHeader {
  docDate: string;
  taxDate: string;
  fromWarehouse: string;
  toWarehouse: string;
  remarks: string;
  baseItrDocEntry?: string;
  baseItrDocNum?: string;
}

export interface InventoryTransferLine {
  itemCode: string;
  itemDescription: string;
  quantity: number | null;
  fromWarehouse: string;
  toWarehouse: string;
  batchNumber: string;
  baseEntry?: string;
  baseLine?: string;
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function createEmptyInventoryTransferHeader(): InventoryTransferHeader {
  const today = todayDateString();
  return {
    docDate: today,
    taxDate: today,
    fromWarehouse: '',
    toWarehouse: '',
    remarks: '',
    baseItrDocEntry: '',
    baseItrDocNum: '',
  };
}

export function createEmptyInventoryTransferLine(
  fromWarehouse = '',
  toWarehouse = '',
): InventoryTransferLine {
  return {
    itemCode: '',
    itemDescription: '',
    quantity: null,
    fromWarehouse,
    toWarehouse,
    batchNumber: '',
    baseEntry: '',
    baseLine: '',
  };
}

export function updateInventoryTransferLine(
  rows: InventoryTransferLine[],
  index: number,
  field: keyof InventoryTransferLine,
  value: string,
): InventoryTransferLine[] {
  return rows.map((row, rowIndex) => {
    if (rowIndex !== index) {
      return row;
    }

    if (field === 'quantity') {
      const numericValue = value === '' ? null : Number(value);
      return { ...row, quantity: Number.isNaN(numericValue) ? null : numericValue };
    }

    return { ...row, [field]: value };
  });
}
