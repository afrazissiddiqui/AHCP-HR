import { ComponentFixture, TestBed } from '@angular/core/testing';
import { canonicalAttendanceKey } from '../../../services/attendance-management.service';
import { AlertService } from '../../../services/alert.service';
import { AttendanceManagementService } from '../../../services/attendance-management.service';
import { OvertimeListRecord, OvertimeListService } from '../../../services/overtime-list.service';
import { WorkstationRecord, WorkstationService } from '../../../services/workstation.service';
import { GatePassDepartmentService } from '../../gate-pass/gate-pass-department.service';
import { TableFilterService } from '../../table-filter';
import { OvertimeListComponent } from './overtime-list';

describe('OvertimeListComponent', () => {
  let fixture: ComponentFixture<OvertimeListComponent>;
  let component: OvertimeListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OvertimeListComponent],
      providers: [
        { provide: AlertService, useValue: {} },
        { provide: AttendanceManagementService, useValue: {} },
        { provide: GatePassDepartmentService, useValue: {} },
        { provide: OvertimeListService, useValue: {} },
        { provide: TableFilterService, useValue: {} },
        { provide: WorkstationService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OvertimeListComponent);
    component = fixture.componentInstance;
  });

  it('shows the shift duration and AM/PM range', () => {
    component.workstations.set([
      {
        id: 1,
        name: 'Shift 1',
        code: 'S1',
        officeInTime: '12:00',
        officeOutTime: '03:00',
        inGraceMinutes: 0,
        outGraceMinutes: 0,
        shift: 'S1',
        description: '',
        status: 1,
      } as WorkstationRecord,
    ]);
    const record = {
      shift: 'S1',
      shiftLookupLoading: false,
      shiftLookupFailed: false,
    } as OvertimeListRecord;

    expect(component.cellValue(record, 'shiftHours')).toBe('3h (12:00 PM - 3:00 PM)');
  });

  it('shows AM/PM correctly for overnight shifts', () => {
    component.workstations.set([
      {
        id: 1,
        name: 'Night Shift',
        code: 'N',
        officeInTime: '22:00',
        officeOutTime: '06:00',
        inGraceMinutes: 0,
        outGraceMinutes: 0,
        shift: 'N',
        description: '',
        status: 1,
      } as WorkstationRecord,
    ]);
    const record = {
      shift: 'N',
      shiftLookupLoading: false,
      shiftLookupFailed: false,
    } as OvertimeListRecord;

    expect(component.cellValue(record, 'shiftHours')).toBe('8h (10:00 PM - 6:00 AM)');
  });

  it('matches an employee shift assignment to the workstation ID', () => {
    component.workstations.set([
      {
        id: 1,
        name: 'AHCP_Peshawar',
        code: '',
        officeInTime: '09:00',
        officeOutTime: '21:00',
        inGraceMinutes: 15,
        outGraceMinutes: 15,
        shift: 'GenralShift',
        description: 'Genral Shift',
        status: 1,
      },
    ]);
    const record = {
      shift: '1',
      shiftLookupLoading: false,
      shiftLookupFailed: false,
    } as OvertimeListRecord;

    expect(component.cellValue(record, 'shiftHours')).toBe('12h (9:00 AM - 9:00 PM)');
  });

  it('reports zero overtime when working hours are below shift hours', () => {
    const record = {
      employeeId: 'EMP-001',
      shift: '1',
      shiftLookupLoading: false,
      shiftLookupFailed: false,
      overtimeHours: 0,
    } as OvertimeListRecord;
    component.workstations.set([
      {
        id: 1,
        name: 'AHCP_Peshawar',
        code: '',
        officeInTime: '09:00',
        officeOutTime: '21:00',
        inGraceMinutes: 15,
        outGraceMinutes: 15,
        shift: 'GenralShift',
        description: 'Genral Shift',
        status: 1,
      },
    ]);
    component['attendanceWorkingHours'].set(
      new Map([[canonicalAttendanceKey(record.employeeId), '7h 55m']]),
    );

    expect(component.cellValue(record, 'overtimeHours')).toBe('0h');
  });
});
