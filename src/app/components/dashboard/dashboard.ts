import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';


@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class dashboardComponent {
  protected readonly title = signal('SAPQC');

  constructor(private router: Router) { }


  listSIR(): void {
    this.router.navigate(['/recruitment']);
  }
}