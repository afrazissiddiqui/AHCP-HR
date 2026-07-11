export interface DeliveryHeader {
  branchId: string;
  branchName: string;
  customer: string;
  customerName: string;
  contactPerson: string;
  customerRefNo: string;
  status: string;
  postingDate: string;
  documentDate: string;
  localCurrency: string;
  salesEmployee: string;
  remarks: string;
  baseSalesOrderNumber: string;
  baseSalesOrderDocEntry: string;
  shipToAddress: string;
  deliveryMethod: string;
  driver: string;
  vehicleNumber: string;
  trackingNumber: string;
}

export interface DeliveryLine {
  itemCode: string;
  itemDescription: string;
  baseDocEntry: string;
  baseLine: string;
  quantity: number | null;
  warehouse: string;
  unitOfMeasure: string;
  unitPrice: number | null;
  batchSerialNumber: string;
  taxCode: string;
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function createEmptyDeliveryHeader(): DeliveryHeader {
  const today = todayDateString();
  return {
    branchId: '1',
    branchName: 'AHCP_HO',
    customer: '',
    customerName: '',
    contactPerson: '',
    customerRefNo: '',
    status: 'Draft',
    postingDate: today,
    documentDate: today,
    localCurrency: 'PKR',
    salesEmployee: '',
    remarks: '',
    baseSalesOrderNumber: '',
    baseSalesOrderDocEntry: '',
    shipToAddress: '',
    deliveryMethod: '',
    driver: '',
    vehicleNumber: '',
    trackingNumber: '',
  };
}

export function createEmptyDeliveryLine(): DeliveryLine {
  return {
    itemCode: '',
    itemDescription: '',
    baseDocEntry: '',
    baseLine: '',
    quantity: null,
    warehouse: '',
    unitOfMeasure: '',
    unitPrice: null,
    batchSerialNumber: '',
    taxCode: '',
  };
}

export function updateDeliveryLine(
  rows: DeliveryLine[],
  index: number,
  field: keyof DeliveryLine,
  value: string,
): DeliveryLine[] {
  return rows.map((row, rowIndex) => {
    if (rowIndex !== index) {
      return row;
    }

    if (field === 'quantity' || field === 'unitPrice') {
      const numericValue = value === '' ? null : Number(value);
      return { ...row, [field]: Number.isNaN(numericValue) ? null : numericValue };
    }

    return { ...row, [field]: value };
  });
}
