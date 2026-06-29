import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
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

  documents: OpenBaseDocument[] = [];
  loading = false;
  readonly skeletonRows = Array.from({ length: 5 }, (_, index) => index);
  private loadSubscription?: Subscription;

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['open'] || changes['documentType'] || changes['gatePassModule']) && this.open) {
      this.loadDocuments();
      return;
    }

    if (changes['open'] && !this.open) {
      this.documents = [];
      this.loading = false;
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

  private loadDocuments(): void {
    this.loadSubscription?.unsubscribe();

    const fetch$ = this.getApiFetch$();
    if (fetch$) {
      this.loading = true;
      this.documents = [];
      this.loadSubscription = fetch$.pipe(finalize(() => (this.loading = false))).subscribe({
        next: (documents) => {
          this.documents = documents;
        },
        error: () => {
          this.documents = [];
        },
      });
      return;
    }

    this.loading = false;
    this.documents = this.openBaseDocuments.listOpenByType(this.gatePassModule, this.documentType);
  }

  private getApiFetch$(): Observable<OpenBaseDocument[]> | null {
    if (this.documentType === 'Sales return request' || this.documentType === 'Sales Return Request') {
      if (this.gatePassModule === 'igp' || this.gatePassModule === 'ogp') {
        return this.openBaseDocuments.fetchSalesReturnRequests();
      }
    }

    if (this.gatePassModule === 'igp' && this.documentType === 'Purchase Order') {
      return this.openBaseDocuments.fetchIgpPurchaseOrders();
    }

    return null;
  }
}
