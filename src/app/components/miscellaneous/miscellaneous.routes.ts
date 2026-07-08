import { Routes } from '@angular/router';
import { CreateGoodIssueComponent } from './create-good-issue';
import { CreateInventoryTransferComponent } from './create-inventory-transfer';
import { GoodIssuePageComponent } from './good-issue-page';
import { InventoryTransferPageComponent } from './inventory-transfer-page';
import { MiscellaneousPageComponent } from './miscellaneous-page';
import { MiscellaneousShellComponent } from './miscellaneous-shell';
import { requirePermission } from '../../guards/permission.guard';

export const miscellaneousRoutes: Routes = [
  {
    path: 'miscellaneous',
    component: MiscellaneousShellComponent,
    children: [
      { path: '', redirectTo: 'good-receipt-note', pathMatch: 'full' },
      {
        path: 'good-receipt-note',
        component: MiscellaneousPageComponent,
        data: { title: 'Good Receipt Note' },
        canActivate: [requirePermission('good_receipt_note_form', 'list')],
      },
      {
        path: 'delivery',
        component: MiscellaneousPageComponent,
        data: { title: 'Delivery' },
        canActivate: [requirePermission('delivery_form', 'list')],
      },
      {
        path: 'inventory-transfer',
        component: InventoryTransferPageComponent,
        data: { title: 'Inventory transfer' },
        canActivate: [requirePermission('inventory_transfer_form', 'list')],
      },
      {
        path: 'inventory-transfer/create',
        component: CreateInventoryTransferComponent,
        data: { title: 'Add Inventory Transfer' },
        canActivate: [requirePermission('inventory_transfer_form', 'add')],
      },
      {
        path: 'inventory-transfer/edit/:id',
        component: CreateInventoryTransferComponent,
        data: { title: 'Edit Inventory Transfer' },
        canActivate: [requirePermission('inventory_transfer_form', 'update')],
      },
      {
        path: 'good-issue',
        component: GoodIssuePageComponent,
        data: { title: 'Good Issue' },
        canActivate: [requirePermission('good_issue_form', 'list')],
      },
      {
        path: 'good-issue/create',
        component: CreateGoodIssueComponent,
        data: { title: 'Add Good Issue' },
        canActivate: [requirePermission('good_issue_form', 'add')],
      },
      {
        path: 'good-issue/edit/:id',
        component: CreateGoodIssueComponent,
        data: { title: 'Edit Good Issue' },
        canActivate: [requirePermission('good_issue_form', 'update')],
      },
    ],
  },
];
