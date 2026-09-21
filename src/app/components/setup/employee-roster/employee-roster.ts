import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApplicationFormRecord, ApplicationFormService } from '../../../services/application-form.service';
import { AlertService } from '../../../services/alert.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';
import { GatePassDepartmentService } from '../../gate-pass/gate-pass-department.service';
import { WorkstationService } from '../../../services/workstation.service';

type ShiftCode = string;
type MonthHalf = 'First Half' | 'Second Half';
interface RosterDay {
  date: number;
  weekday: string;
  isToday: boolean;
  isHoliday: boolean;
}

interface BranchHoliday {
  date: number;
  weekday: string;
  label: string;
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
  private readonly departmentService = inject(GatePassDepartmentService);
  readonly workstationService = inject(WorkstationService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly employees = signal<RosterEmployee[]>([]);
  readonly searchText = signal('');
  readonly selectedHub = signal('Lahore HO');
  readonly selectedDepartment = signal('All Departments');
  readonly selectedDepartmentCode = signal('');
  readonly departmentOptions = this.departmentService.departments;
  readonly monthLabel = signal('September 2026');
  readonly selectedMonthHalf = signal<MonthHalf>('First Half');
  readonly selectedCell = signal<{ employeeCode: string; day: number } | null>(null);
  readonly shiftDialog = signal<{ employee: RosterEmployee; dayIndex: number; shift: ShiftCode } | null>(null);
  readonly shiftDialogPosition = signal({ top: 0, left: 0 });
  readonly shiftDialogDragging = signal(false);
  private shiftDialogDrag: { pointerId: number; startX: number; startY: number; startTop: number; startLeft: number } | null = null;
  readonly hasChanges = signal(false);
  readonly selectedEmployees = signal(new Set<string>());
  readonly conflictsVisible = signal(true);
  readonly workstationLoading = signal(false);
  readonly workstationLegendOpen = signal(false);
  readonly branchHolidaysOpen = signal(false);
  readonly shiftOptions = computed(() => {
    const options = this.workstationService.workstations()
      .map((workstation) => ({
        code: workstation.shift.trim(),
        title: workstation.description.trim() || workstation.name.trim() || workstation.shift.trim(),
        className: 'dynamic',
      }))
      .filter((option) => option.code);
    const uniqueOptions = options.filter(
      (option, index, allOptions) => allOptions.findIndex((item) => item.code.toLowerCase() === option.code.toLowerCase()) === index,
    );

    return [
      ...uniqueOptions,
      { code: 'HOL', title: 'Holiday', hours: '', className: 'holiday' },
      { code: 'OFF', title: 'Scheduled Day Off', hours: '', className: 'off' },
    ];
  });

  readonly visibleDays = computed<RosterDay[]>(() => {
    const [monthName, yearText] = this.monthLabel().split(' ');
    const year = Number(yearText);
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstHalf = this.selectedMonthHalf() === 'First Half';
    const today = new Date();

    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = index + 1;
      const day = new Date(year, monthIndex, date);
      return {
        date,
        weekday: day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        isToday:
          today.getFullYear() === year &&
          today.getMonth() === monthIndex &&
          today.getDate() === date,
        isHoliday: day.getDay() === 0 || day.getDay() === 6,
      };
    }).filter((day) => (firstHalf ? day.date <= 15 : day.date > 15));
  });

  readonly branchHolidays = computed<BranchHoliday[]>(() => {
    const [monthName, yearText] = this.monthLabel().split(' ');
    const year = Number(yearText);
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, monthIndex, index + 1);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      return {
        date: index + 1,
        weekday,
        label: weekday === 'Sunday' ? 'Weekly holiday' : 'Weekend holiday',
      };
    }).filter((holiday) => holiday.weekday === 'Saturday' || holiday.weekday === 'Sunday');
  });

  readonly filteredEmployees = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    const department = this.selectedDepartment();
    return this.employees().filter((employee) => {
      const matchesDepartment = department === 'All Departments' || employee.Department === department;
      const matchesSearch = !query || [employee.EmployeeName, employee.EmployeeCode, employee.Designation, employee.Department]
        .join(' ')
        .toLowerCase()
        .includes(query);
      return matchesDepartment && matchesSearch;
    });
  });

  readonly totalEmployees = computed(() => this.employees().length);
  readonly morningCount = computed(() => this.employees().filter((employee) => employee.shifts.includes('M')).length);
  readonly eveningCount = computed(() => this.employees().filter((employee) => employee.shifts.includes('E')).length);
  readonly nightCount = computed(() => this.employees().filter((employee) => employee.shifts.includes('N')).length);
  readonly unassignedCount = computed(() => Math.max(0, this.totalEmployees() - this.morningCount() - this.eveningCount() - this.nightCount()));
  readonly activeCount = computed(() => this.filteredEmployees().length);

  readonly allVisibleSelected = computed(() => {
    const visible = this.filteredEmployees();
    const selected = this.selectedEmployees();
    return visible.length > 0 && visible.every((employee) => selected.has(employee.EmployeeCode));
  });

  ngOnInit(): void {
    this.departmentService.ensureLoaded().subscribe();
    this.loadWorkstations();
    this.loadEmployees();
  }

  private loadWorkstations(): void {
    this.workstationLoading.set(true);
    this.workstationService.fetchWorkstations().pipe(finalize(() => this.workstationLoading.set(false))).subscribe({
      error: (error: unknown) => {
        this.alertService.error('Shift Load Failed', formatApiErrorMessage(error, 'Could not load workstation shifts.'));
      },
    });
  }

  onDepartmentChange(departmentName: string): void {
    this.selectedDepartment.set(departmentName);
    const department = this.departmentOptions().find((item) => item.name === departmentName);
    this.selectedDepartmentCode.set(department?.id ?? '');
  }

  openWorkstationLegend(): void {
    this.workstationLegendOpen.set(true);
  }

  closeWorkstationLegend(): void {
    this.workstationLegendOpen.set(false);
  }

  openBranchHolidays(): void {
    this.branchHolidaysOpen.set(true);
  }

  closeBranchHolidays(): void {
    this.branchHolidaysOpen.set(false);
  }

  loadEmployees(): void {
    this.loading.set(true);
    this.employeeService
      .fetchEmployeeProfiles()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (records) => {
          const shiftApplicableRecords = records.filter((record) =>
            record.detail?.hrSettings.attendanceShiftManagement.trim().toLowerCase() === 'yes',
          );
          this.employees.set(shiftApplicableRecords.map((record, index) => this.toRosterEmployee(record, index)));
        },
        error: (error) => {
          this.employees.set([]);
          this.alertService.error('Roster Load Failed', formatApiErrorMessage(error, 'Could not load employee profiles.'));
        },
      });
  }

  shiftFor(employee: RosterEmployee, dayIndex: number): ShiftCode {
    return employee.shifts.length ? employee.shifts[dayIndex % employee.shifts.length] : '+';
  }

  toggleEmployee(employee: RosterEmployee, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedEmployees.update((selected) => {
      const next = new Set(selected);
      if (checked) {
        next.add(employee.EmployeeCode);
      } else {
        next.delete(employee.EmployeeCode);
      }
      return next;
    });
  }

  toggleAllVisible(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedEmployees.update((selected) => {
      const next = new Set(selected);
      this.filteredEmployees().forEach((employee) => {
        if (checked) {
          next.add(employee.EmployeeCode);
        } else {
          next.delete(employee.EmployeeCode);
        }
      });
      return next;
    });
  }

  isEmployeeSelected(employee: RosterEmployee): boolean {
    return this.selectedEmployees().has(employee.EmployeeCode);
  }

  shiftClass(shift: ShiftCode): string {
    return 'roster-shift';
  }

  shiftBackground(description: string): string {
    return `hsl(${this.descriptionHue(description)} 88% 92%)`;
  }

  shiftForeground(description: string): string {
    return `hsl(${this.descriptionHue(description)} 55% 28%)`;
  }

  shiftName(shift: ShiftCode): string {
    return { M: 'Morning', E: 'Evening', N: 'Night', OFF: 'Day Off', L: 'Leave', HOL: 'Holiday', '+': 'Unassigned' }[shift] || shift;
  }

  shiftDescription(shift: string): string {
    const workstation = this.workstationService
      .workstations()
      .find((item) => item.shift.trim().toLowerCase() === shift.trim().toLowerCase());
    return workstation?.description.trim() || workstation?.name.trim() || this.shiftName(shift);
  }

  private descriptionHue(description: string): number {
    const normalizedDescription = description.trim().toLowerCase();
    if (normalizedDescription === 'morning') {
      return 45;
    }
    if (normalizedDescription === 'holiday') {
      return 145;
    }
    if (normalizedDescription === 'scheduled day off' || normalizedDescription === 'day off') {
      return 215;
    }

    const descriptions = this.workstationService
      .workstations()
      .map((workstation) => workstation.description.trim() || workstation.name.trim() || workstation.shift.trim())
      .filter(Boolean)
      .filter((value, index, values) => values.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index);
    const index = descriptions.findIndex((value) => value.trim().toLowerCase() === normalizedDescription);
    return index >= 0 ? (28 + index * 137.508) % 360 : 215;
  }

  selectCell(employee: RosterEmployee, dayIndex: number): void {
    this.selectedCell.set({ employeeCode: employee.EmployeeCode, day: dayIndex });
  }

  openShiftDialog(employee: RosterEmployee, dayIndex: number, event: MouseEvent): void {
    this.selectedCell.set({ employeeCode: employee.EmployeeCode, day: dayIndex });
    this.shiftDialog.set({ employee, dayIndex, shift: this.shiftFor(employee, dayIndex) });
    const popoverWidth = 350;
    const popoverHeight = Math.min(560, Math.max(220, window.innerHeight - 16));
    const gap = 10;
    const left = event.clientX + gap + popoverWidth <= window.innerWidth
      ? event.clientX + gap
      : event.clientX - popoverWidth - gap;
    const top = Math.min(Math.max(8, event.clientY - 70), Math.max(8, window.innerHeight - popoverHeight - 8));
    this.shiftDialogPosition.set({
      top,
      left: Math.max(8, left),
    });
  }

  startShiftDialogDrag(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }

    const element = event.currentTarget as HTMLElement;
    element.setPointerCapture(event.pointerId);
    const position = this.shiftDialogPosition();
    this.shiftDialogDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTop: position.top,
      startLeft: position.left,
    };
    this.shiftDialogDragging.set(true);
    event.preventDefault();
  }

  moveShiftDialog(event: PointerEvent): void {
    const drag = this.shiftDialogDrag;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const dialog = event.currentTarget as HTMLElement;
    const maxTop = Math.max(8, window.innerHeight - dialog.offsetHeight - 8);
    const maxLeft = Math.max(8, window.innerWidth - dialog.offsetWidth - 8);
    this.shiftDialogPosition.set({
      top: Math.min(Math.max(8, drag.startTop + event.clientY - drag.startY), maxTop),
      left: Math.min(Math.max(8, drag.startLeft + event.clientX - drag.startX), maxLeft),
    });
  }

  endShiftDialogDrag(event: PointerEvent): void {
    if (!this.shiftDialogDrag || this.shiftDialogDrag.pointerId !== event.pointerId) {
      return;
    }

    this.shiftDialogDrag = null;
    this.shiftDialogDragging.set(false);
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
    const employeeCodes = this.selectedEmployees();
    if (employeeCodes.size > 0) {
      this.employees.update((employees) => employees.map((employee) => {
        if (!employeeCodes.has(employee.EmployeeCode)) {
          return employee;
        }
        return { ...employee, shifts: employee.shifts.map(() => shift) };
      }));
      this.hasChanges.set(true);
      return;
    }
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

  assignDaysOff(): void {
    this.assignShift('OFF');
  }

  applyRotation(): void {
    const selected = this.selectedEmployees();
    if (!selected.size) {
      this.alertService.validation('Select at least one employee first.');
      return;
    }
    this.employees.update((employees) => employees.map((employee) => {
      if (!selected.has(employee.EmployeeCode) || !employee.shifts.length) {
        return employee;
      }
      return { ...employee, shifts: [...employee.shifts.slice(1), employee.shifts[0]] };
    }));
    this.hasChanges.set(true);
  }

  changeMonth(offset: number): void {
    const [monthName, yearText] = this.monthLabel().split(' ');
    const date = new Date(`${monthName} 1, ${yearText}`);
    date.setMonth(date.getMonth() + offset);
    this.monthLabel.set(date.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
  }

  jumpToToday(): void {
    const today = new Date();
    this.monthLabel.set(today.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
  }

  onMonthHalfChange(value: string): void {
    this.selectedMonthHalf.set(value as MonthHalf);
    this.clearSelection();
  }

  dismissConflicts(): void {
    this.conflictsVisible.set(false);
  }

  clearSelection(): void {
    this.selectedCell.set(null);
    this.selectedEmployees.set(new Set());
  }

  saveChanges(): void {
    if (!this.hasChanges() || this.saving()) {
      return;
    }

    const payload = {
      data: this.employees().flatMap((employee) =>
        this.visibleDays().map((day, dayIndex) => ({
          employee_id: employee.EmployeeCode,
          shift_date: this.rosterDate(day.date),
          shift: this.shiftFor(employee, dayIndex),
          role: employee.role,
          hub: this.selectedHub(),
          note: null,
        })),
      ),
    };

    this.saving.set(true);
    this.employeeService
      .addEmployeeRoster(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.hasChanges.set(false);
          this.alertService.success('Roster Updated', 'Roster changes were saved successfully.');
        },
        error: (error) => {
          this.alertService.error('Roster Save Failed', formatApiErrorMessage(error, 'Could not save roster changes.'));
        },
      });
  }

  private rosterDate(day: number): string {
    const [monthName, year] = this.monthLabel().split(' ');
    const month = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
      hub: 'Lahore HO',
      role: record.Designation || ['Ops', 'Supp', 'Logistics', 'Eng', 'Staff'][index % 5],
      shifts: patterns[index % patterns.length],
    };
  }
}
