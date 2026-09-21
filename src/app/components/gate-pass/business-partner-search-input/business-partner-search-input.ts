import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  GatePassBusinessPartner,
  GatePassBusinessPartnerService,
} from '../gate-pass-business-partner.service';

@Component({
  selector: 'app-gate-pass-business-partner-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './business-partner-search-input.html',
  styleUrl: './business-partner-search-input.css',
})
export class GatePassBusinessPartnerSearchInputComponent {
  private readonly businessPartnerService = inject(GatePassBusinessPartnerService);

  @Input() value = '';
  @Input() placeholder = 'Search code or name';
  @Input() inputId = '';
  @Input() disabled = false;
  @Input() supplierOnly = false;
  @Input() allPartners = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() partnerSelected = new EventEmitter<GatePassBusinessPartner>();

  suggestionsOpen = false;
  suggestions: GatePassBusinessPartner[] = [];
  loadingSuggestions = false;
  suggestionPosition = { top: 0, left: 0, width: 0 };

  onInput(next: string, event: Event): void {
    if (this.disabled) {
      return;
    }
    this.valueChange.emit(next);
    this.refreshSuggestions(next, event.currentTarget as HTMLInputElement);
  }

  openSuggestions(event: FocusEvent): void {
    if (this.disabled) {
      return;
    }
    if (this.value.trim()) {
      this.refreshSuggestions(this.value, event.currentTarget as HTMLInputElement);
    }
  }

  onBlur(): void {
    setTimeout(() => {
      this.suggestionsOpen = false;
    }, 150);
  }

  selectPartner(partner: GatePassBusinessPartner): void {
    if (this.disabled) {
      return;
    }
    this.partnerSelected.emit(partner);
    this.suggestionsOpen = false;
  }

  private refreshSuggestions(query: string, input: HTMLInputElement): void {
    if (!query.trim()) {
      this.suggestions = [];
      this.suggestionsOpen = false;
      this.loadingSuggestions = false;
      return;
    }

    const bounds = input.getBoundingClientRect();
    this.suggestionPosition = {
      top: bounds.bottom + 2,
      left: bounds.left,
      width: bounds.width,
    };
    this.suggestionsOpen = true;
    this.loadingSuggestions = true;
    const load$ = this.allPartners
      ? this.businessPartnerService.ensureAllLoaded()
      : this.supplierOnly
      ? this.businessPartnerService.ensureSuppliersLoaded()
      : this.businessPartnerService.ensureLoaded();
    load$.subscribe({
      next: () => {
        this.suggestions = this.allPartners
          ? this.businessPartnerService.searchAll(query)
          : this.supplierOnly
          ? this.businessPartnerService.searchSuppliers(query)
          : this.businessPartnerService.search(query);
        this.loadingSuggestions = false;
      },
      error: () => {
        this.suggestions = [];
        this.loadingSuggestions = false;
      },
    });
  }
}
