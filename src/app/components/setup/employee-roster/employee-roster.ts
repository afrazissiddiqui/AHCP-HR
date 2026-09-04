import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApplicationFormRecord, ApplicationFormService } from '../../../services/application-form.service';
import { AlertService } from '../../../services/alert.service';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';

type ShiftCode = 'M' | 'E' | 'N' | 'OFF' | 'L' | 'HOL' | '+';
interface RosterDay {
  date: number;
  weekday: string;
  isToday: boolean;
  isHoliday: boolean;
}

interface RosterEmployee extends ApplicationFormRecord {
  hub: string;
  role: string;
  shifts: ShiftCode[];
}

@Component({
  selector: 'app-employee-roster',
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './employee-roster.html',
  styleUrl: './employee-roster.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class EmployeeRosterComponent implements OnInit {
  private readonly employeeService = inject(ApplicationFormService);
  private readonly alertService = inject(AlertService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly employees = signal<RosterEmployee[]>([]);
  readonly searchText = signal('');
  readonly selectedHub = signal('Lahore HQ');
  readonly selectedDepartment = signal('Operations');
  readonly monthLabel = signal('September 2026');
  readonly selectedCell = signal<{ employeeCode: string; day: number } | null>(null);
  readonly shiftDialog = signal<{ employee: RosterEmployee; dayIndex: number; shift: ShiftCode } | null>(null);
  readonly shiftDialogPosition = signal({ top: 0, left: 0 });
  readonly hasChanges = signal(false);
  readonly shiftOptions: Array<{ code: ShiftCode; title: string; hours: string; className: string }> = [
    { code: 'M', title: 'Morning Shift', hours: '08:00 AM - 04:00 PM', className: 'morning' },
    { code: 'E', title: 'Evening Shift', hours: '04:00 PM - 12:00 AM', className: 'evening' },
    { code: 'N', title: 'Night Shift', hours: '12:00 AM - 08:00 AM', className: 'night' },
    { code: 'OFF', title: 'Scheduled Day Off', hours: '', className: 'off' },
  ];

  readonly days: RosterDay[] = [
    { date: 5, weekday: 'SAT', isToday: false, isHoliday: true },
    { date: 6, weekday: 'SUN', isToday: false, isHoliday: true },
    { date: 7, weekday: 'MON', isToday: true, isHoliday: false },
    { date: 8, weekday: 'TUE', isToday: false, isHoliday: false },
    { date: 9, weekday: 'WED', isToday: false, isHoliday: false },
    { date: 10, weekday: 'THU', isToday: false, isHoliday: false },
    { date: 11, weekday: 'FRI', isToday: false, isHoliday: false },
    { date: 12, weekday: 'SAT', isToday: false, isHoliday: true },
    { date: 13, weekday: 'SUN', isToday: false, isHoliday: true },
    { date: 14, weekday: 'MON', isToday: false, isHoliday: false },
    { date: 15, weekday: 'TUE', isToday: false, isHoliday: false },
    { date: 16, weekday: 'WED', isToday: false, isHoliday: false },
    { date: 17, weekday: 'THU', isToday: false, isHoliday: false },
    { date: 18, weekday: 'FRI', isToday: false, isHoliday: false },
    { date: 19, weekday: 'SAT', isToday: false, isHoliday: true },
    { date: 20, weekday: 'SUN', isToday: false, isHoliday: true },
    { date: 21, weekday: 'MON', isToday: false, isHoliday: false },
    { date: 22, weekday: 'TUE', isToday: false, isHoliday: false },
    { date: 23, weekday: 'WED', isToday: false, isHoliday: false },
  ];

  readonly filteredEmployees = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    if (!query) {
      return this.employees();
    }
    return this.employees().filter((employee) =>
      [employee.EmployeeName, employee.EmployeeCode, employee.Designation, employee.Department]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  });

  readonly totalEmployees = computed(() => this.employees().length || 124);
  readonly morningCount = computed(() => this.employees().filter((employee) => employee.shifts.includes('M')).length || 52);
  readonly eveningCount = computed(() => this.employees().filter((employee) => employee.shifts.includes('E')).length || 41);
  readonly nightCount = computed(() => this.employees().filter((employee) => employee.shifts.includes('N')).length || 31);
  readonly unassignedCount = computed(() => Math.max(0, this.totalEmployees() - this.morningCount() - this.eveningCount() - this.nightCount()));
  readonly activeCount = computed(() => this.filteredEmployees().length);

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading.set(true);
    this.employeeService
      .fetchEmployeeProfiles()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (records) => this.employees.set(records.map((record, index) => this.toRosterEmployee(record, index))),
        error: () => this.employees.set([]),
      });
  }

  shiftFor(employee: RosterEmployee, dayIndex: number): ShiftCode {
    return employee.shifts[dayIndex % employee.shifts.length] ?? '+';
  }

  shiftClass(shift: ShiftCode): string {
    return `roster-shift roster-shift--${shift.toLowerCase()}`;
  }

  shiftName(shift: ShiftCode): string {
    return { M: 'Morning', E: 'Evening', N: 'Night', OFF: 'Day Off', L: 'Leave', HOL: 'Holiday', '+': 'Unassigned' }[shift];
  }

  selectCell(employee: RosterEmployee, dayIndex: number): void {
    this.selectedCell.set({ employeeCode: employee.EmployeeCode, day: dayIndex });
  }

  openShiftDialog(employee: RosterEmployee, dayIndex: number, event: MouseEvent): void {
    this.selectedCell.set({ employeeCode: employee.EmployeeCode, day: dayIndex });
    this.shiftDialog.set({ employee, dayIndex, shift: this.shiftFor(employee, dayIndex) });
    const popoverWidth = 320;
    const popoverHeight = 370;
    const gap = 10;
    const left = event.clientX + gap + popoverWidth <= window.innerWidth
      ? event.clientX + gap
      : event.clientX - popoverWidth - gap;
    const top = Math.min(Math.max(8, event.clientY - 70), window.innerHeight - popoverHeight - 8);
    this.shiftDialogPosition.set({
      top,
      left: Math.max(8, left),
    });
  }

  chooseDialogShift(shift: ShiftCode): void {
    this.shiftDialog.update((dialog) => (dialog ? { ...dialog, shift } : dialog));
  }

  closeShiftDialog(): void {
    this.shiftDialog.set(null);
  }

  applyDialogShift(): void {
    const dialog = this.shiftDialog();
    if (!dialog) {
      return;
    }
    this.assignShift(dialog.shift);
    this.closeShiftDialog();
  }

  assignShift(shift: ShiftCode): void {
    const selected = this.selectedCell();
    if (!selected) {
      this.alertService.validation('Select a roster cell first.');
      return;
    }
    this.employees.update((employees) => employees.map((employee) => {
      if (employee.EmployeeCode !== selected.employeeCode) {
        return employee;
      }
      const shifts = [...employee.shifts];
      shifts[selected.day % shifts.length] = shift;
      return { ...employee, shifts };
    }));
    this.hasChanges.set(true);
  }

  clearSelection(): void {
    this.selectedCell.set(null);
  }

  saveChanges(): void {
    if (!this.hasChanges() || this.saving()) {
      return;
    }
    this.saving.set(true);
    setTimeout(() => {
      this.saving.set(false);
      this.hasChanges.set(false);
      this.alertService.success('Roster Updated', 'Roster changes are ready for review.');
    }, 350);
  }

  private toRosterEmployee(record: ApplicationFormRecord, index: number): RosterEmployee {
    const patterns: ShiftCode[][] = [
      ['E', 'E', 'E', 'M', 'M', 'OFF', 'OFF'],
      ['N', 'N', 'N', 'OFF', 'OFF', 'M', 'M'],
      ['M', 'M', 'M', 'OFF', 'OFF', 'N', 'N'],
      ['M', 'M', 'M', 'M', 'M', 'OFF', 'OFF'],
      ['E', 'E', 'E', 'OFF', 'E', 'E', 'E'],
    ];
    return {
      ...record,
      hub: 'Lahore HQ',
      role: record.Designation || ['Ops', 'Supp', 'Logistics', 'Eng', 'Staff'][index % 5],
      shifts: patterns[index % patterns.length],
    };
  }
}
