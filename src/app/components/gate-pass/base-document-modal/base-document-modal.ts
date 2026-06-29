import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject, signal } from '@angular/core';
import { Observable, Subscription, finalize } from 'rxjs';
import { GatePassModule, OpenBaseDocument, OpenBaseDocumentsService } from '../open-base-documents.service';

@Component({
  selector: 'app-base-document-modal',
  standalone: true,
  imports: [CommonModule],
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
  readonly skeletonRows = Array.from({ length: 5 }, (_, index) => index);
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
    }
  }

  close(): void {
    this.openChange.emit(false);
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

  private cancelLoad(): void {
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = undefined;
  }

  private loadDocuments(): void {
    this.cancelLoad();

    const fetch$ = this.getApiFetch$();
    if (fetch$) {
      this.loading.set(true);
      this.documents.set([]);
      this.loadSubscription = fetch$
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (documents) => {
            this.documents.set(documents);
          },
          error: () => {
            this.documents.set([]);
          },
        });
      return;
    }

    this.loading.set(false);
    this.documents.set(this.openBaseDocuments.listOpenByType(this.gatePassModule, this.documentType));
  }

  private getApiFetch$(): Observable<OpenBaseDocument[]> | null {
    const usesApi =
      this.gatePassModule === 'igp' || this.gatePassModule === 'ogp';

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
