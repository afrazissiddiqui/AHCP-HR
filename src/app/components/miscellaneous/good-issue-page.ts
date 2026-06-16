import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageToolbarComponent } from '../page-toolbar/page-toolbar';

interface GoodIssueRow {
  issueNo: string;
  postingDate: string;
  fromWarehouse: string;
  issuedTo: string;
  itemCount: number;
  status: 'Draft' | 'Posted';
}

type LineSection = 'content' | 'attachment';

interface IssueLineRow {
  itemNo: string;
  itemDescription: string;
  quantity: number | null;
  account: string;
  itemCost: number | null;
  uomCode: string;
}

@Component({
  selector: 'app-good-issue-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './good-issue-page.html',
  styleUrl: './good-issue-page.css',
})
export class GoodIssuePageComponent {
  readonly searchText = signal('');
  readonly showAddForm = signal(false);
  readonly activeLineSection = signal<LineSection>('content');

  readonly headerForm = signal({
    numberSeries: '',
    postingDate: '',
    documentDate: '',
    refNumber: '',
    priceList: '',
  });

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

  readonly contentLines = signal<IssueLineRow[]>([this.createEmptyLine()]);
  readonly attachmentLines = signal<IssueLineRow[]>([this.createEmptyLine()]);

  onAddNewIssue(): void {
    this.showAddForm.set(true);
  }

  onBackToList(): void {
    this.showAddForm.set(false);
  }

  setLineSection(section: LineSection): void {
    this.activeLineSection.set(section);
  }

  updateHeaderField(
    field: 'numberSeries' | 'postingDate' | 'documentDate' | 'refNumber' | 'priceList',
    value: string
  ): void {
    this.headerForm.update((state) => ({ ...state, [field]: value }));
  }

  getActiveLines(): IssueLineRow[] {
    return this.activeLineSection() === 'content' ? this.contentLines() : this.attachmentLines();
  }

  addLineRow(): void {
    if (this.activeLineSection() === 'content') {
      this.contentLines.update((rows) => [...rows, this.createEmptyLine()]);
      return;
    }
    this.attachmentLines.update((rows) => [...rows, this.createEmptyLine()]);
  }

  updateLine(index: number, field: keyof IssueLineRow, value: string): void {
    const target = this.activeLineSection() === 'content' ? this.contentLines : this.attachmentLines;
    target.update((rows) =>
      rows.map((row, i) => {
        if (i !== index) {
          return row;
        }

        if (field === 'quantity' || field === 'itemCost') {
          const numericValue = value === '' ? null : Number(value);
          return { ...row, [field]: Number.isNaN(numericValue) ? null : numericValue };
        }

        return { ...row, [field]: value };
      })
    );
  }

  private createEmptyLine(): IssueLineRow {
    return {
      itemNo: '',
      itemDescription: '',
      quantity: null,
      account: '',
      itemCost: null,
      uomCode: '',
    };
  }
}
