import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../../../services/alert.service';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { PayrollMasterLayoutService } from '../payroll-master-layout.service';
import { TaxAllowanceRow, TaxAllowanceService } from '../tax-allowance.service';

@Component({
  selector: 'app-tax-managment',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './tax-managment.html',
  styleUrl: './tax-managment.css',
})
export class TaxManagmentComponent {
  private readonly alertService = inject(AlertService);
  private readonly layout = inject(PayrollMasterLayoutService);
  protected readonly taxAllowance = inject(TaxAllowanceService);

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  async onCheckboxChange(row: TaxAllowanceRow, event: Event): Promise<void> {
    const checkbox = event.target as HTMLInputElement;
    const intendedValue = checkbox.checked;

    checkbox.checked = row.enabled;

    const action = intendedValue ? 'enable' : 'disable';
    const result = await this.alertService.confirm(
      `${intendedValue ? 'Enable' : 'Disable'} field?`,
      `Are you sure you want to ${action} "${row.label}"?`,
    );

    if (result.isConfirmed) {
      this.taxAllowance.setEnabled(row.key, intendedValue);
    }
  }

  onGlCodeChange(key: string, glCode: string): void {
    this.taxAllowance.setGlCode(key, glCode);
  }
}
