import { Routes } from '@angular/router';
import { CreateGoodIssueComponent } from './create-good-issue';
import { CreateInventoryTransferComponent } from './create-inventory-transfer';
import { GoodIssuePageComponent } from './good-issue-page';
import { InventoryTransferPageComponent } from './inventory-transfer-page';
import { MiscellaneousPageComponent } from './miscellaneous-page';
import { MiscellaneousShellComponent } from './miscellaneous-shell';

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
      },
      {
        path: 'delivery',
        component: MiscellaneousPageComponent,
        data: { title: 'Delivery' },
      },
      {
        path: 'inventory-transfer',
        component: InventoryTransferPageComponent,
        data: { title: 'Inventory transfer' },
      },
      {
        path: 'inventory-transfer/create',
        component: CreateInventoryTransferComponent,
        data: { title: 'Add Inventory Transfer' },
      },
      {
        path: 'good-issue',
        component: GoodIssuePageComponent,
        data: { title: 'Good Issue' },
      },
      {
        path: 'good-issue/create',
        component: CreateGoodIssueComponent,
        data: { title: 'Add Good Issue' },
      },
    ],
  },
];
