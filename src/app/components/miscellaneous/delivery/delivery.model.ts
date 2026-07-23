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
  remarks: string;
  baseSalesOrderNumber: string;
  baseSalesOrderDocEntry: string;
  shipToAddress: string;
  deliveryMethod: string;
  driver: string;
  vehicleNumber: string;
  trackingNumber: string;
  builtyNo: string;
  driverNo: string;
  driverName: string;
  vehicleNo: string;
  transporterName: string;
  igpDateCus: string;
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
  bpCatalogNo: string;
  discountPercent: number | null;
  binLocation: string;
  cogsDepartment: string;
  country: string;
  branch: string;
  blanketAgreementNo: string;
  standardItemIdentification: string;
  commodityClassification: string;
  qtyPerJumboCarton: number | null;
  jumboCartonsCount: number | null;
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
    remarks: '',
    baseSalesOrderNumber: '',
    baseSalesOrderDocEntry: '',
    shipToAddress: '',
    deliveryMethod: '',
    driver: '',
    vehicleNumber: '',
    trackingNumber: '',
    builtyNo: '',
    driverNo: '',
    driverName: '',
    vehicleNo: '',
    transporterName: '',
    igpDateCus: '',
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
    bpCatalogNo: '',
    discountPercent: null,
    binLocation: '',
    cogsDepartment: '',
    country: '',
    branch: '',
    blanketAgreementNo: '',
    standardItemIdentification: '',
    commodityClassification: '',
    qtyPerJumboCarton: null,
    jumboCartonsCount: null,
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

    // Numeric fields: convert to number or null
    if (
      field === 'quantity' ||
      field === 'unitPrice' ||
      field === 'discountPercent' ||
      field === 'qtyPerJumboCarton' ||
      field === 'jumboCartonsCount'
    ) {
      const numericValue = value === '' ? null : Number(value);
      const normalized = Number.isNaN(numericValue) ? null : numericValue;

      const updatedRow: DeliveryLine = { ...row, [field]: normalized } as DeliveryLine;

      // If updating one of the jumbo-carton fields, and both are present (>0),
      // set `quantity` to their product.
      if (field === 'qtyPerJumboCarton' || field === 'jumboCartonsCount') {
        const per = field === 'qtyPerJumboCarton' ? normalized : row.qtyPerJumboCarton;
        const count = field === 'jumboCartonsCount' ? normalized : row.jumboCartonsCount;

        const perNum = per ?? null;
        const countNum = count ?? null;

        if (perNum && countNum && perNum > 0 && countNum > 0) {
          updatedRow.quantity = perNum * countNum;
        }
      }

      return updatedRow;
    }

    return { ...row, [field]: value };
  });
}
