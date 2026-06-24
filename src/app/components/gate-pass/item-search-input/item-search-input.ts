import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  @Input() value = '';
  @Input() placeholder = 'Search code or name';
  @Input() inputId = '';

  @Output() valueChange = new EventEmitter<string>();
  @Output() itemSelected = new EventEmitter<GatePassItemMaster>();

  suggestionsOpen = false;
  suggestions: GatePassItemMaster[] = [];

  constructor(private readonly itemMaster: GatePassItemMasterService) {}

  onInput(next: string): void {
    this.valueChange.emit(next);
    this.suggestions = this.itemMaster.search(next);
    this.suggestionsOpen = true;
  }

  openSuggestions(): void {
    if (this.value.trim()) {
      this.suggestions = this.itemMaster.search(this.value);
      this.suggestionsOpen = true;
    }
  }

  onBlur(): void {
    setTimeout(() => {
      this.suggestionsOpen = false;
    }, 150);
  }

  selectItem(item: GatePassItemMaster): void {
    this.itemSelected.emit(item);
    this.suggestionsOpen = false;
  }
}
