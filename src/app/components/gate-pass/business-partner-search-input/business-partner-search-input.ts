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

  @Output() valueChange = new EventEmitter<string>();
  @Output() partnerSelected = new EventEmitter<GatePassBusinessPartner>();

  suggestionsOpen = false;
  suggestions: GatePassBusinessPartner[] = [];
  loadingSuggestions = false;

  onInput(next: string): void {
    if (this.disabled) {
      return;
    }
    this.valueChange.emit(next);
    this.refreshSuggestions(next);
  }

  openSuggestions(): void {
    if (this.disabled) {
      return;
    }
    if (this.value.trim()) {
      this.refreshSuggestions(this.value);
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

  private refreshSuggestions(query: string): void {
    if (!query.trim()) {
      this.suggestions = [];
      this.suggestionsOpen = false;
      this.loadingSuggestions = false;
      return;
    }

    this.suggestionsOpen = true;
    this.loadingSuggestions = true;
    this.businessPartnerService.ensureLoaded().subscribe({
      next: () => {
        this.suggestions = this.businessPartnerService.search(query);
        this.loadingSuggestions = false;
      },
      error: () => {
        this.suggestions = [];
        this.loadingSuggestions = false;
      },
    });
  }
}
