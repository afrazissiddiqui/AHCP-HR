import { Routes } from '@angular/router';
import { GatePassShellComponent } from './gate-pass-shell';
import { IgpComponent } from './igp/igp';
import { CreateIgpComponent } from './igp/create-igp/create-igp';
import { OgpComponent } from './ogp/ogp';
import { CreateOgpComponent } from './ogp/create-ogp/create-ogp';

export const gatePassRoutes: Routes = [
  {
    path: 'gate-pass',
    component: GatePassShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'igp' },
      { path: 'igp', component: IgpComponent },
      { path: 'igp/create', component: CreateIgpComponent },
      { path: 'ogp', component: OgpComponent },
      { path: 'ogp/create', component: CreateOgpComponent },
    ],
  },
  { path: 'igp', redirectTo: 'gate-pass/igp', pathMatch: 'full' },
  { path: 'igp/create', redirectTo: 'gate-pass/igp/create', pathMatch: 'full' },
  { path: 'ogp', redirectTo: 'gate-pass/ogp', pathMatch: 'full' },
  { path: 'ogp/create', redirectTo: 'gate-pass/ogp/create', pathMatch: 'full' },
];
