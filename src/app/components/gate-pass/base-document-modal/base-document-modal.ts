import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { GatePassModule, OpenBaseDocument, OpenBaseDocumentsService } from '../open-base-documents.service';

@Component({
  selector: 'app-base-document-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './base-document-modal.html',
  styleUrl: './base-document-modal.css',
})
export class BaseDocumentModalComponent implements OnChanges {
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
    const fetch$ = this.getApiFetch$();
    if (fetch$) {
      this.loading = true;
      this.documents = [];
      fetch$.pipe(finalize(() => (this.loading = false))).subscribe({
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
    if (this.gatePassModule !== 'igp') {
      return null;
    }

    if (this.documentType === 'Purchase Order') {
      return this.openBaseDocuments.fetchIgpPurchaseOrders();
    }

    if (this.documentType === 'Sales Return Request') {
      return this.openBaseDocuments.fetchIgpSalesReturnRequests();
    }

    return null;
  }
}
