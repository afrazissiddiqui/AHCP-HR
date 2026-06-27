import { Injectable } from '@angular/core';

export interface GatePassItemMaster {
  itemCode: string;
  itemName: string;
  category: string;
  packingCondition: string;
  productQuality: string;
  uom: string;
}

const ITEM_MASTER_CATALOG: GatePassItemMaster[] = [
  { itemCode: 'PKG-01', itemName: 'Corrugated boxes 3-ply', category: 'Packaging', packingCondition: 'Sealed', productQuality: 'Grade A', uom: 'EA' },
  { itemCode: 'PKG-02', itemName: 'Stretch film rolls', category: 'Packaging', packingCondition: 'Sealed', productQuality: 'Grade A', uom: 'ROLL' },
  { itemCode: 'SP-M12', itemName: 'Bearing set M12', category: 'Spares', packingCondition: 'Oiled', productQuality: 'Standard', uom: 'SET' },
  { itemCode: 'SP-BLT', itemName: 'Drive belt B-100', category: 'Spares', packingCondition: 'Wrapped', productQuality: 'Standard', uom: 'PC' },
  { itemCode: 'RM-CTN', itemName: 'Raw cotton grade A', category: 'Raw', packingCondition: 'Bales', productQuality: 'Grade A', uom: 'KG' },
  { itemCode: 'FG-101', itemName: 'Finished yarn cones 40s', category: 'FG', packingCondition: 'Palletized', productQuality: 'Grade A', uom: 'CTN' },
  { itemCode: 'FG-102', itemName: 'Finished fabric rolls', category: 'FG', packingCondition: 'Wrapped', productQuality: 'Grade A', uom: 'ROLL' },
  { itemCode: 'FG-310', itemName: 'Packed garments cartons', category: 'FG', packingCondition: 'Sealed', productQuality: 'Export', uom: 'CTN' },
  { itemCode: 'EXP-01', itemName: 'Greige fabric bales', category: 'Export', packingCondition: 'Bales', productQuality: 'Grade A', uom: 'BALE' },
  { itemCode: 'RET-01', itemName: 'Mixed SKU return pallet', category: 'Returns', packingCondition: 'Mixed', productQuality: 'Hold', uom: 'PLT' },
  { itemCode: 'IT-LP01', itemName: 'Laptop Dell Latitude 5540', category: 'IT Assets', packingCondition: 'Boxed', productQuality: 'Working', uom: 'EA' },
  { itemCode: 'IT-MT02', itemName: 'Digital multimeter kit', category: 'IT Assets', packingCondition: 'Case', productQuality: 'Calibrated', uom: 'SET' },
  { itemCode: 'TL-900', itemName: 'Torque wrench set', category: 'Tools', packingCondition: 'Case', productQuality: 'Good', uom: 'SET' },
  { itemCode: 'DSP-01', itemName: 'Product display stand', category: 'Marketing', packingCondition: 'Crated', productQuality: 'New', uom: 'EA' },
  { itemCode: 'WIP-12', itemName: 'Cut fabric bundles', category: 'WIP', packingCondition: 'Bundled', productQuality: 'Standard', uom: 'BND' },
  { itemCode: 'MISC-01', itemName: 'Promotional samples bundle', category: 'Misc', packingCondition: 'Box', productQuality: 'N/A', uom: 'BOX' },
  { itemCode: 'SMP-CSR', itemName: 'Product sample kit CSR', category: 'Samples', packingCondition: 'Carton', productQuality: 'N/A', uom: 'KIT' },
  { itemCode: 'CAP-88', itemName: 'Precision measuring unit', category: 'Capital', packingCondition: 'Crated', productQuality: 'New', uom: 'EA' },
  { itemCode: 'DEMO-20', itemName: 'Demo loom control panel', category: 'Demo', packingCondition: 'Crated', productQuality: 'Used', uom: 'EA' },
];

export interface GatePassLineItemFields {
  itemCode: string;
  itemName: string;
  category?: string;
  packingCondition?: string;
  productQuality?: string;
  uom?: string;
}

const ALLOCATABLE_ASSET_CATEGORIES = new Set(['IT Assets', 'Tools', 'Capital']);

@Injectable({ providedIn: 'root' })
export class GatePassItemMasterService {
  listAllocatableAssets(): GatePassItemMaster[] {
    return ITEM_MASTER_CATALOG.filter((item) => ALLOCATABLE_ASSET_CATEGORIES.has(item.category));
  }

  search(query: string, limit = 8): GatePassItemMaster[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return ITEM_MASTER_CATALOG.filter(
      (item) =>
        item.itemCode.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    ).slice(0, limit);
  }

  applyToLine(line: GatePassLineItemFields, item: GatePassItemMaster): void {
    line.itemCode = item.itemCode;
    line.itemName = item.itemName;
    if (line.category !== undefined) {
      line.category = item.category;
    }
    if (line.packingCondition !== undefined) {
      line.packingCondition = item.packingCondition;
    }
    if (line.productQuality !== undefined) {
      line.productQuality = item.productQuality;
    }
    if (line.uom !== undefined) {
      line.uom = item.uom;
    }
  }
}
