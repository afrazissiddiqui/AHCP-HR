import { Routes } from '@angular/router';
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
        path: 'good-issue',
        component: GoodIssuePageComponent,
        data: { title: 'Good Issue' },
      },
    ],
  },
];
