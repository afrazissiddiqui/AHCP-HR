import { Component, signal, ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface FormRow {
  title: string;
  employee: string;
  currentStep: string;
  currentlyWith: string;
  stepDueDate: string;
}

@Component({
  selector: 'app-recruitment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recruitment.html',
  styleUrl: './recruitment.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RecruitmentComponent {
  protected readonly selected = signal('enRoute');
  constructor(private readonly router: Router) {}

  protected readonly expanded = signal({
    inProgress: true,
    completed: true
  });

  // Filter states for En Route view
  protected readonly template = signal('All');
  protected readonly currentStep = signal('All');
  protected readonly group = signal('All');
  protected readonly allOrReportsOnly = signal('All Planners');
  protected readonly planner = signal('');
  protected readonly division = signal('All');
  protected readonly department = signal('All');
  protected readonly location = signal('All');

  protected readonly formRows = signal<FormRow[]>([
    {
      title: 'Sandbox Bonus Payout Individual View Molly Huddleston (M1)',
      employee: 'Molly Huddleston',
      currentStep: 'VP Approval for Annual Plan',
      currentlyWith: 'Jerry Choaté',
      stepDueDate: '–'
    },
    {
      title: 'SandBox Business + Individual Incentive Plan Molly Huddleston (M1)',
      employee: 'Molly Huddleston',
      currentStep: 'VP Approval for Annual Plan',
      currentlyWith: 'Jerry Choaté',
      stepDueDate: '–'
    },
    {
      title: 'Sandbox Annual Salary Plan Molly Huddleston (M1)',
      employee: 'Molly Huddleston',
      currentStep: 'Compensation Approval',
      currentlyWith: 'Jerry Choaté',
      stepDueDate: '–'
    }
  ]);

  toggle(section: 'inProgress' | 'completed'): void {
    this.expanded.update(state => ({
      ...state,
      [section]: !state[section]
    }));
  }

  selectFolder(folder: string): void {
    this.selected.set(folder);
    console.log('Selected:', folder);
  }

  manageFolders(): void {
    console.log('Manage folders clicked');
  }

  goClick(): void {
    console.log('Go button clicked with filters:', {
      template: this.template(),
      currentStep: this.currentStep(),
      group: this.group(),
      allOrReportsOnly: this.allOrReportsOnly(),
      planner: this.planner(),
      division: this.division(),
      department: this.department(),
      location: this.location()
    });
  }

  resetClick(): void {
    this.template.set('All');
    this.currentStep.set('All');
    this.group.set('All');
    this.allOrReportsOnly.set('All Planners');
    this.planner.set('');
    this.division.set('All');
    this.department.set('All');
    this.location.set('All');
    console.log('Filters reset');
  }

  viewForm(title: string): void {
    console.log('View form:', title);
  }

  openCreateJobRequisition(): void {
    void this.router.navigateByUrl('/recruitment/create');
  }
}
