export interface GoodReceiptHeader {
  branchId: string;
  branchName: string;
  remarks: string;
  postingDate: string;
  documentDate: string;
  dueDate: string;
}

export interface GoodReceiptLine {
  itemCode: string;
  itemDescription: string;
  warehouse: string;
  quantity: number | null;
  unitPrice: number | null;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  baseEntry?: string;
  baseLine?: string;
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function plusDaysDateString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function createEmptyGoodReceiptHeader(): GoodReceiptHeader {
  const today = todayDateString();
  return {
    branchId: '2',
    branchName: 'AHCP_HO',
    remarks: '',
    postingDate: today,
    documentDate: today,
    dueDate: today,
  };
}

export function createEmptyGoodReceiptLine(): GoodReceiptLine {
  return {
    itemCode: '',
    itemDescription: '',
    warehouse: '',
    quantity: null,
    unitPrice: null,
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: plusDaysDateString(10),
    baseEntry: '',
    baseLine: '',
  };
}

export function updateGoodReceiptLine(
  rows: GoodReceiptLine[],
  index: number,
  field: keyof GoodReceiptLine,
  value: string,
): GoodReceiptLine[] {
  return rows.map((row, rowIndex) => {
    if (rowIndex !== index) {
      return row;
    }

    if (field === 'unitPrice' || field === 'quantity') {
      const numericValue = value === '' ? null : Number(value);
      return { ...row, [field]: Number.isNaN(numericValue) ? null : numericValue };
    }

    return { ...row, [field]: value };
  });
}
