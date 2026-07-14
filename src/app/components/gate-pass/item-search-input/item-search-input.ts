import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GatePassItemMaster, GatePassItemMasterService } from '../gate-pass-item-master.service';

@Component({
  selector: 'app-gate-pass-item-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './item-search-input.html',
  styleUrl: './item-search-input.css',
})
export class GatePassItemSearchInputComponent {
  private readonly itemMaster = inject(GatePassItemMasterService);

  @Input() value = '';
  @Input() placeholder = 'Search code or name';
  @Input() inputId = '';
  @Input() displayMode?: 'code' | 'name';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() itemSelected = new EventEmitter<GatePassItemMaster>();

  suggestionsOpen = false;
  suggestions: GatePassItemMaster[] = [];
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

  selectItem(item: GatePassItemMaster): void {
    if (this.disabled) {
      return;
    }
    // Update the visible value immediately so the input shows the selected item
    // Prefer explicit `displayMode` input; fall back to inputId heuristic
    const displayValue = (this.displayMode
      ? this.displayMode === 'code'
      : String(this.inputId || '').toLowerCase().includes('-code'))
      ? item.itemCode
      : item.itemName;
    this.value = displayValue;
    this.valueChange.emit(displayValue);
    this.itemSelected.emit(item);
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
    this.itemMaster.ensureLoaded().subscribe({
      next: () => {
        this.suggestions = this.itemMaster.search(query);
        this.loadingSuggestions = false;
      },
      error: () => {
        this.suggestions = [];
        this.loadingSuggestions = false;
      },
    });
  }
}
