import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { PayrollMasterLayoutService } from '../payroll-master-layout.service';

@Component({
  selector: 'app-payroll-processing',
  standalone: true,
  imports: [CommonModule, PageToolbarComponent],
  templateUrl: './payroll-processing.html',
  styleUrl: '../../Application-Form/Application-Form.css',
})
export class PayrollProcessingComponent {
  private readonly layout = inject(PayrollMasterLayoutService);

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }
}
