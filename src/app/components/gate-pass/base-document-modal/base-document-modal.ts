import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription, finalize } from 'rxjs';
import { GatePassModule, OpenBaseDocument, OpenBaseDocumentsService } from '../open-base-documents.service';
import { resolveGatePassLocationFromBplId } from '../gate-pass-location.options';
import { displayDateSlash } from '../../../utils/date-format.util';

@Component({
  selector: 'app-base-document-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './base-document-modal.html',
  styleUrl: './base-document-modal.css',
})
export class BaseDocumentModalComponent implements OnChanges, OnDestroy {
  private readonly openBaseDocuments = inject(OpenBaseDocumentsService);

  @Input() open = false;
  @Input() gatePassModule: GatePassModule = 'igp';
  /** Must match the Type dropdown value for the active gate-pass form. */
  @Input() documentType = '';

  @Output() openChange = new EventEmitter<boolean>();
  @Output() documentPicked = new EventEmitter<OpenBaseDocument>();

  readonly documents = signal<OpenBaseDocument[]>([]);
  readonly loading = signal(false);
  readonly searchText = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 25, 50];
  readonly skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  readonly filteredDocuments = computed(() => {
    const search = this.searchText().trim().toLowerCase();
    const docs = this.documents();
    if (!search) {
      return docs;
    }
    return docs.filter((doc) => {
      const hay = [
        doc.number,
        doc.title,
        doc.businessPartnerName,
        doc.partner,
        doc.businessPartnerCode,
        doc.bplId,
        doc.date,
        doc.docDate,
      ]
        .filter((value) => value != null && value !== '')
        .join(' ')
        .toLowerCase();
      return hay.includes(search);
    });
  });

  readonly paginatedDocuments = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredDocuments().slice(start, start + this.pageSize());
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredDocuments().length / this.pageSize())),
  );

  readonly pages = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));

  Math = Math;
  readonly displayDateSlash = displayDateSlash;
  private loadSubscription?: Subscription;

  ngOnDestroy(): void {
    this.cancelLoad();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['open'] || changes['documentType'] || changes['gatePassModule']) && this.open) {
      this.loadDocuments();
      return;
    }

    if (changes['open'] && !this.open) {
      this.cancelLoad();
      this.documents.set([]);
      this.loading.set(false);
      this.resetListState();
    }
  }

  close(): void {
    this.openChange.emit(false);
  }

  onSearchChange(): void {
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(): void {
    this.currentPage.set(1);
  }

  onBackdropClick(): void {
    this.close();
  }

  onModalClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  select(doc: OpenBaseDocument): void {
    this.documentPicked.emit(doc);
    this.close();
  }

  getBplLabel(bplId?: string): string {
    return resolveGatePassLocationFromBplId(bplId) || bplId?.trim() || '—';
  }

  private cancelLoad(): void {
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = undefined;
  }

  private resetListState(): void {
    this.searchText.set('');
    this.currentPage.set(1);
  }

  private loadDocuments(): void {
    this.cancelLoad();
    this.resetListState();

    const fetch$ = this.getApiFetch$();
    if (fetch$) {
      this.loading.set(true);
      this.documents.set([]);
      this.loadSubscription = fetch$
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (documents) => {
            this.documents.set(this.filterOpenDocuments(documents));
          },
          error: () => {
            this.documents.set([]);
          },
        });
      return;
    }

    this.loading.set(false);
    this.documents.set(this.filterOpenDocuments(this.openBaseDocuments.listOpenByType(this.gatePassModule, this.documentType)));
  }

  private filterOpenDocuments(documents: OpenBaseDocument[]): OpenBaseDocument[] {
    return documents.filter((doc) => doc.status === undefined || doc.status === 'O');
  }

  private getApiFetch$(): Observable<OpenBaseDocument[]> | null {
    if (this.gatePassModule === 'ogp' && this.documentType === 'Delivery') {
      return this.openBaseDocuments.fetchDeliveries();
    }

    const usesApi =
      this.gatePassModule === 'igp' ||
      this.gatePassModule === 'ogp' ||
      this.gatePassModule === 'agp';

    if (!usesApi) {
      return null;
    }

    if (this.documentType === 'Sales return request' || this.documentType === 'Sales Return Request') {
      return this.openBaseDocuments.fetchSalesReturnRequests();
    }

    if (this.documentType === 'Purchase Order') {
      return this.openBaseDocuments.fetchPurchaseOrders();
    }

    return null;
  }
}
