export interface MiscellaneousHeaderForm {
  numberSeries: string;
  postingDate: string;
  documentDate: string;
  refNumber: string;
  priceList: string;
}

export interface MiscellaneousLineRow {
  itemNo: string;
  itemDescription: string;
  quantity: number | null;
  account: string;
  itemCost: number | null;
  uomCode: string;
}

export function createEmptyMiscellaneousLine(): MiscellaneousLineRow {
  return {
    itemNo: '',
    itemDescription: '',
    quantity: null,
    account: '',
    itemCost: null,
    uomCode: '',
  };
}

export function createEmptyMiscellaneousHeader(): MiscellaneousHeaderForm {
  return {
    numberSeries: '',
    postingDate: '',
    documentDate: '',
    refNumber: '',
    priceList: '',
  };
}

export function updateMiscellaneousLine(
  rows: MiscellaneousLineRow[],
  index: number,
  field: keyof MiscellaneousLineRow,
  value: string
): MiscellaneousLineRow[] {
  return rows.map((row, i) => {
    if (i !== index) {
      return row;
    }

    if (field === 'quantity' || field === 'itemCost') {
      const numericValue = value === '' ? null : Number(value);
      return { ...row, [field]: Number.isNaN(numericValue) ? null : numericValue };
    }

    return { ...row, [field]: value };
  });
}
