import { Routes } from '@angular/router';
import { GatePassShellComponent } from './gate-pass-shell';
import { IgpComponent } from './igp/igp';
import { CreateIgpComponent } from './igp/create-igp/create-igp';
import { OgpComponent } from './ogp/ogp';
import { CreateOgpComponent } from './ogp/create-ogp/create-ogp';
import { AgpComponent } from './agp/agp';
import { CreateAgpComponent } from './agp/create-agp/create-agp';

export const gatePassRoutes: Routes = [
  {
    path: 'gate-pass',
    component: GatePassShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'igp' },
      { path: 'igp', component: IgpComponent },
      { path: 'igp/create', component: CreateIgpComponent },
      { path: 'igp/edit/:id', component: CreateIgpComponent },
      { path: 'ogp', component: OgpComponent },
      { path: 'ogp/create', component: CreateOgpComponent },
      { path: 'agp', component: AgpComponent },
      { path: 'agp/create', component: CreateAgpComponent },
    ],
  },
  { path: 'igp', redirectTo: 'gate-pass/igp', pathMatch: 'full' },
  { path: 'igp/create', redirectTo: 'gate-pass/igp/create', pathMatch: 'full' },
  { path: 'igp/edit/:id', redirectTo: 'gate-pass/igp/edit/:id', pathMatch: 'full' },
  { path: 'ogp', redirectTo: 'gate-pass/ogp', pathMatch: 'full' },
  { path: 'ogp/create', redirectTo: 'gate-pass/ogp/create', pathMatch: 'full' },
  { path: 'agp', redirectTo: 'gate-pass/agp', pathMatch: 'full' },
  { path: 'agp/create', redirectTo: 'gate-pass/agp/create', pathMatch: 'full' },
];
