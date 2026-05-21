import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { PayrollMasterLayoutService } from '../payroll-master-layout.service';

@Component({
  selector: 'app-attendance-managment',
  standalone: true,
  imports: [CommonModule, PageToolbarComponent],
  templateUrl: './attendance-managment.html',
  styleUrl: '../../Application-Form/Application-Form.css',
})
export class AttendanceManagmentComponent {
  private readonly layout = inject(PayrollMasterLayoutService);

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }
}
