import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PageToolbarComponent } from '../page-toolbar/page-toolbar';

@Component({
  selector: 'app-miscellaneous-page',
  standalone: true,
  imports: [CommonModule, PageToolbarComponent],
  templateUrl: './miscellaneous-page.html',
  styleUrl: './miscellaneous-page.css',
})
export class MiscellaneousPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly pageTitle = computed(
    () => this.route.snapshot.data['title'] as string ?? 'Miscellaneous'
  );
}
