import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageToolbarComponent } from '../page-toolbar/page-toolbar';
import { AlertService } from '../../services/alert.service';
import { MiscellaneousLayoutService } from './miscellaneous-layout.service';

export interface GoodIssueRow {
  issueNo: string;
  postingDate: string;
  fromWarehouse: string;
  issuedTo: string;
  itemCount: number;
  status: 'Draft' | 'Posted';
}

@Component({
  selector: 'app-good-issue-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './good-issue-page.html',
  styleUrls: ['./miscellaneous-list.css'],
})
export class GoodIssuePageComponent {
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly searchText = signal('');
  readonly showDetailDialog = signal(false);
  readonly selectedRow = signal<GoodIssueRow | null>(null);

  readonly issues = signal<GoodIssueRow[]>([
    {
      issueNo: 'GI-2026-0001',
      postingDate: '2026-06-08',
      fromWarehouse: 'Main Store',
      issuedTo: 'Production',
      itemCount: 4,
      status: 'Posted',
    },
    {
      issueNo: 'GI-2026-0002',
      postingDate: '2026-06-11',
      fromWarehouse: 'Raw Material',
      issuedTo: 'Maintenance',
      itemCount: 2,
      status: 'Draft',
    },
  ]);

  readonly filteredIssues = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    if (!term) {
      return this.issues();
    }

    return this.issues().filter((row) =>
      row.issueNo.toLowerCase().includes(term) ||
      row.fromWarehouse.toLowerCase().includes(term) ||
      row.issuedTo.toLowerCase().includes(term) ||
      row.status.toLowerCase().includes(term)
    );
  });

  onAddNewIssue(): void {
    void this.router.navigate(['/miscellaneous/good-issue/create']);
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  viewDetails(row: GoodIssueRow): void {
    this.selectedRow.set(row);
    this.showDetailDialog.set(true);
  }

  closeDetailDialog(): void {
    this.selectedRow.set(null);
    this.showDetailDialog.set(false);
  }

  onUpdate(row: GoodIssueRow): void {
    void this.router.navigate(['/miscellaneous/good-issue/edit', row.issueNo]);
  }

  async onDelete(row: GoodIssueRow): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete Good Issue?',
      `Remove ${row.issueNo} from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    this.issues.update((rows) => rows.filter((item) => item.issueNo !== row.issueNo));
    this.alertService.success('Deleted', 'Good issue removed successfully.');
  }
}
