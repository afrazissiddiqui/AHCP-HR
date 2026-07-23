export interface GoodIssueHeader {
  branchId: string;
  branchName: string;
  issuedFrom: string;
  issuedTo: string;
  taxDate: string;
  docDate: string;
  docDueDate: string;
  remarks: string;
  status: string;
}

export interface GoodIssueLine {
  itemCode: string;
  itemDescription: string;
  warehouse: string;
  branch: string;
  quantity: number | null;
  unitPrice: number | null;
  batchSerialNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  binLocationAllocation: string;
  accountCode: string;
  itemCost: number | null;
  uomCode: string;
  uomName: string;
  departmentsLocations: string;
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function plusDaysDateString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function createEmptyGoodIssueHeader(): GoodIssueHeader {
  const today = todayDateString();
  return {
    branchId: '1',
    branchName: 'AHCP_HO',
    issuedFrom: '',
    issuedTo: '',
    taxDate: today,
    docDate: today,
    docDueDate: today,
    remarks: '',
    status: 'Draft',
  };
}

export function createEmptyGoodIssueLine(): GoodIssueLine {
  return {
    itemCode: '',
    itemDescription: '',
    warehouse: '',
    branch: '',
    quantity: null,
    unitPrice: null,
    batchSerialNumber: '',
    manufacturingDate: '',
    expiryDate: plusDaysDateString(10),
    binLocationAllocation: '',
    accountCode: '',
    itemCost: null,
    uomCode: '',
    uomName: '',
    departmentsLocations: '',
  };
}

export function updateGoodIssueLine(
  rows: GoodIssueLine[],
  index: number,
  field: keyof GoodIssueLine,
  value: string,
): GoodIssueLine[] {
  return rows.map((row, rowIndex) => {
    if (rowIndex !== index) {
      return row;
    }

    if (field === 'quantity' || field === 'unitPrice' || field === 'itemCost') {
      const numericValue = value === '' ? null : Number(value);
      return { ...row, [field]: Number.isNaN(numericValue) ? null : numericValue };
    }

    return { ...row, [field]: value };
  });
}
