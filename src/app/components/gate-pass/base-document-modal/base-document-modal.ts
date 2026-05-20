import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { OpenBaseDocument, OpenBaseDocumentsService } from '../open-base-documents.service';

@Component({
  selector: 'app-base-document-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './base-document-modal.html',
  styleUrl: './base-document-modal.css',
})
export class BaseDocumentModalComponent implements OnChanges {
  @Input() open = false;
  /** Must match the Type dropdown value (Purchase Order, Sales Return Request, Stand Alone Documents). */
  @Input() documentType = '';

  @Output() openChange = new EventEmitter<boolean>();
  @Output() documentPicked = new EventEmitter<OpenBaseDocument>();

  documents: OpenBaseDocument[] = [];

  constructor(private readonly openBaseDocuments: OpenBaseDocumentsService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['open'] || changes['documentType']) && this.open) {
      this.documents = this.openBaseDocuments.listOpenByType(this.documentType);
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
}
