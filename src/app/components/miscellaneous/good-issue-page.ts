import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageToolbarComponent } from '../page-toolbar/page-toolbar';
import { MiscellaneousLayoutService } from './miscellaneous-layout.service';

interface GoodIssueRow {
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
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly searchText = signal('');

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
}
