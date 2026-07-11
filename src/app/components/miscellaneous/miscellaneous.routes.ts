import { Routes } from '@angular/router';
import { Delivery } from './delivery/delivery';
import { AddDelivery } from './delivery/add-delivery/add-delivery';
import { GoodIssue } from './good-issue/good-issue';
import { AddGoodIssue } from './good-issue/add-good-issue/add-good-issue';
import { GoodReceipt } from './good-receipt/good-receipt';
import { AddGoodReceipt } from './good-receipt/add-good-receipt/add-good-receipt';
import { InventoryTransfer } from './inventory-transfer/inventory-transfer';
import { AddInventoryTransfer } from './inventory-transfer/add-inventory-transfer/add-inventory-transfer';
import { MiscellaneousPageComponent } from './miscellaneous-page';
import { MiscellaneousShellComponent } from './miscellaneous-shell';
import { ReceiptFromProduction } from './receipt-from-production/receipt-from-production';
import { AddReceiptFromProduction } from './receipt-from-production/add-receipt-from-production/add-receipt-from-production';
import { SampleInspectionRequest } from '../sample-inspection-request/sample-inspection-request';
import { SampleInspectionRequestForm } from '../sample-inspection-request/sample-inspection-request-form/sample-inspection-request-form';

export const miscellaneousRoutes: Routes = [
  {
    path: 'miscellaneous',
    component: MiscellaneousShellComponent,
    children: [
      {
        path: '',
        component: MiscellaneousPageComponent,
        data: { title: 'SAP Form' },
      },
      {
        path: 'good-receipt-note',
        component: GoodReceipt,
        data: { title: 'Good Receipt' },
      },
      {
        path: 'good-receipt-note/create',
        component: AddGoodReceipt,
        data: { title: 'Add Good Receipt' },
      },
      {
        path: 'good-receipt-note/edit/:id',
        component: AddGoodReceipt,
        data: { title: 'Edit Good Receipt' },
      },
      {
        path: 'receipt-from-production',
        component: ReceiptFromProduction,
        data: { title: 'Receipt From Production' },
      },
      {
        path: 'receipt-from-production/create',
        component: AddReceiptFromProduction,
        data: { title: 'Add Receipt From Production' },
      },
      {
        path: 'delivery',
        component: Delivery,
        data: { title: 'Delivery' },
      },
      {
        path: 'delivery/create',
        component: AddDelivery,
        data: { title: 'Add Delivery' },
      },
      {
        path: 'delivery/edit/:id',
        component: AddDelivery,
        data: { title: 'Edit Delivery' },
      },
      {
        path: 'inventory-transfer',
        component: InventoryTransfer,
        data: { title: 'Inventory transfer' },
      },
      {
        path: 'inventory-transfer/create',
        component: AddInventoryTransfer,
        data: { title: 'Add Inventory Transfer' },
      },
      {
        path: 'inventory-transfer/edit/:id',
        component: AddInventoryTransfer,
        data: { title: 'Edit Inventory Transfer' },
      },
      {
        path: 'good-issue',
        component: GoodIssue,
        data: { title: 'Good Issue' },
      },
      {
        path: 'good-issue/create',
        component: AddGoodIssue,
        data: { title: 'Add Good Issue' },
      },
      {
        path: 'good-issue/edit/:id',
        component: AddGoodIssue,
        data: { title: 'Edit Good Issue' },
      },
      {
        path: 'sample-inspection-request',
        component: SampleInspectionRequest,
        data: { title: 'Sample Inspection Request' },
      },
      {
        path: 'sample-inspection-request/form',
        component: SampleInspectionRequestForm,
        data: { title: 'Sample Inspection Request' },
      },
    ],
  },
];
