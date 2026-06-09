import { Injectable, signal } from '@angular/core';

export type HuskyFormStatus = 'Draft' | 'Submitted' | 'In Review' | 'Approved' | 'Rejected';

export type HuskyKpiStatus = 'Pass' | 'Warning' | 'Fail' | '';

export interface HuskyKpiRow {
  key: string;
  label: string;
  formulaLabel: string;
  issuesScore: number | null;
  maxPossibleScore: number | null;
  notes: string;
}

export const HUSKY_KPI_ROW_DEFINITIONS: ReadonlyArray<{
  key: string;
  label: string;
  formulaLabel: string;
}> = [
  {
    key: 'safety',
    label: 'Safety',
    formulaLabel: 'Safety Issues Score / Safety Max Possible Score × 100',
  },
  {
    key: 'hydraulic',
    label: 'Hydraulic',
    formulaLabel: 'Hydraulic Issues Score / Hydraulic Possible Score × 100',
  },
  {
    key: 'mechanical',
    label: 'Mechanical',
    formulaLabel: 'Mechanical Issues Score / Mechanical Possible Score × 100',
  },
  {
    key: 'geometry',
    label: 'Geometry',
    formulaLabel: 'Geometry Issues Score / Geometry Possible Score × 100',
  },
  {
    key: 'robot-conveyor',
    label: 'Robot and Conveyor',
    formulaLabel: 'Issues Score / Possible Score × 100',
  },
];

export function createEmptyHuskyKpiRows(): HuskyKpiRow[] {
  return HUSKY_KPI_ROW_DEFINITIONS.map((row) => ({
    key: row.key,
    label: row.label,
    formulaLabel: row.formulaLabel,
    issuesScore: null,
    maxPossibleScore: null,
    notes: '',
  }));
}

export function resolveHuskyKpiStatus(percentage: number | null): HuskyKpiStatus {
  if (percentage === null) {
    return '';
  }
  if (percentage <= 30) {
    return 'Pass';
  }
  if (percentage <= 60) {
    return 'Warning';
  }
  return 'Fail';
}

export type HuskyCheckpointEvaluation = 'Pass' | 'Fail' | 'N/A' | '';

export interface HuskySectionCheckpoint {
  key: string;
  checkpoint: string;
  evaluation: HuskyCheckpointEvaluation;
  recommendation: string;
}

export type HuskySafetyCheckpoint = HuskySectionCheckpoint;
export type HuskyHydraulicCheckpoint = HuskySectionCheckpoint;
export type HuskyMechanicalCheckpoint = HuskySectionCheckpoint;

export const HUSKY_SAFETY_CHECKPOINT_DEFINITIONS: ReadonlyArray<{
  key: string;
  checkpoint: string;
}> = [
  {
    key: 'low-air-pressure-alarm',
    checkpoint:
      'Check low air pressure alarm stops cycle; verify alarm on screen',
  },
  {
    key: 'e-stop-power',
    checkpoint:
      'E-stop interrupts all power, shuts off pump, dumps accumulators',
  },
  {
    key: 'alarm-light-horn',
    checkpoint: 'Alarm light and horn sounds during alarm condition',
  },
  {
    key: 'safety-signs',
    checkpoint:
      'Safety signs correctly installed, clean and readable at potential hazard',
  },
  {
    key: 'lockout-tagout',
    checkpoint:
      'Air supply valves and power cabinet breaker have lockout/tagout features',
  },
  {
    key: 'limit-proxy-switches',
    checkpoint: 'Limit and proxy switches in good condition and operate correctly',
  },
  {
    key: 'safety-glass',
    checkpoint: 'Safety glass not damaged',
  },
  {
    key: 'barrel-cover-grounding',
    checkpoint: 'Barrel cover grounding straps connected',
  },
  {
    key: 'safety-gates',
    checkpoint: 'Safety gates installed and functioning normally',
  },
  {
    key: 'purge-guard-movement',
    checkpoint: 'Purge guard opening stops movement',
  },
  {
    key: 'clamp-well-guards',
    checkpoint: 'Clamp well guards installed (gap max 19" / 483 mm to floor)',
  },
  {
    key: 'finger-safe-guards',
    checkpoint: 'Finger-safe guards on cabinet components',
  },
];

export const HUSKY_HYDRAULIC_CHECKPOINT_DEFINITIONS: ReadonlyArray<{
  key: string;
  checkpoint: string;
}> = [
  { key: 'general-housekeeping', checkpoint: 'General housekeeping' },
  { key: 'no-unusual-movements', checkpoint: 'No unusual movements or noises' },
  {
    key: 'hydraulic-oil-temperature',
    checkpoint: 'Hydraulic oil temperature within specifications',
  },
  { key: 'hydraulic-oil-level', checkpoint: 'Hydraulic oil level' },
  { key: 'extruder-oil-level', checkpoint: 'Extruder oil level' },
  { key: 'hose-inspection', checkpoint: 'Hose inspection' },
  {
    key: 'hose-restraints',
    checkpoint: 'Hose restraints present and properly installed',
  },
  { key: 'clamp-cylinder', checkpoint: 'Clamp cylinder' },
  { key: 'mold-stroke-cylinders', checkpoint: 'Mold stroke cylinder(s)' },
  { key: 'power-manifold', checkpoint: 'Power manifold' },
  { key: 'injection-manifold', checkpoint: 'Injection manifold' },
  { key: 'clamp-manifold', checkpoint: 'Clamp manifold' },
  { key: 'stroke-manifold', checkpoint: 'Stroke manifold' },
  { key: 'ejector-manifold', checkpoint: 'Ejector manifold' },
  { key: 'injection-accumulator-manifold', checkpoint: 'Injection accumulator manifold' },
  { key: 'clamp-accumulator-manifold', checkpoint: 'Clamp accumulator manifold' },
  { key: 'options-manifolds', checkpoint: 'Options manifolds' },
  { key: 'booster-cylinder', checkpoint: 'Booster cylinder' },
  { key: 'ejector-cylinder', checkpoint: 'Ejector cylinder' },
  { key: 'shutter-cylinders', checkpoint: 'Shutter cylinder(s)' },
  { key: 'clamp-accumulator', checkpoint: 'Clamp accumulator' },
  {
    key: 'injection-system-accumulator',
    checkpoint: 'Injection/System accumulator (RS machine only)',
  },
  { key: 'injection-cylinder-a', checkpoint: 'Injection cylinder A' },
  { key: 'transfer-cylinders', checkpoint: 'Transfer cylinders' },
  { key: 'extruder-motor-a', checkpoint: 'Extruder motor A' },
  { key: 'extruder-gear-box', checkpoint: 'Extruder gear box' },
  { key: 'carriage-cylinder-a', checkpoint: 'Carriage cylinder A' },
  { key: 'shut-off-nozzle-cylinder-a', checkpoint: 'Shut off nozzle cylinder A' },
  { key: 'hydraulic-power-pack', checkpoint: 'Hydraulic power pack / pumps' },
  { key: 'pressure-offline-filter', checkpoint: 'Pressure / offline filter' },
  { key: 'suction-filter-inspection', checkpoint: 'Suction filter inspection' },
  { key: 'cartridge-valve-inspection', checkpoint: 'Cartridge valve inspection' },
];

export const HUSKY_MECHANICAL_CHECKPOINT_DEFINITIONS: ReadonlyArray<{
  key: string;
  checkpoint: string;
}> = [
  { key: 'tank-transfer-breathers', checkpoint: 'Tank and Transfer cylinder breathers' },
  { key: 'water-saver-valves', checkpoint: 'Water saver valves' },
  { key: 'shutoff-linkage', checkpoint: 'Shutoff linkage inspection' },
  { key: 'drool-nipple', checkpoint: 'Check if the drool nipple is blocked' },
  { key: 'heat-exchanger', checkpoint: 'Heat exchanger functioning' },
  {
    key: 'motor-water-circuit',
    checkpoint: 'Electric motor water circuit for flow',
  },
  {
    key: 'motor-pump-coupling',
    checkpoint: 'Check electrical motor/pump coupling',
  },
  {
    key: 'tempo-sonic-rods',
    checkpoint: 'Tempo Sonic rods (rod head color - yellow or green)',
  },
  {
    key: 'leveling-mounts',
    checkpoint: 'Leveling mounts not old, loose, or damaged',
  },
  { key: 'pump-motor-mounts', checkpoint: 'Pump motor mounts' },
  { key: 'pump-mounts', checkpoint: 'Pump mounts' },
  { key: 'tie-bar-condition', checkpoint: 'Tie bar condition' },
  {
    key: 'tie-bar-wear-pads',
    checkpoint: 'Tie bar support / wear pads condition',
  },
  { key: 'rail-condition', checkpoint: 'Rail condition' },
  { key: 'clamp-wear-pads', checkpoint: 'Clamp wear pads condition' },
  {
    key: 'moving-platen-shoes',
    checkpoint: 'Moving platen shoes & shims condition',
  },
  { key: 'linear-bearings-rails', checkpoint: 'Linear bearings and rails' },
  {
    key: 'shutter-housing-shoes',
    checkpoint: 'Shutter housing shoes & shims condition',
  },
  { key: 'cable-track', checkpoint: 'Cable track inspection' },
  { key: 'auto-lube-system', checkpoint: 'Auto lube / central lube system' },
  {
    key: 'air-pressure-gauge',
    checkpoint: 'Air pressure gauge condition and reading',
  },
  { key: 'oil-drain-bowls-installed', checkpoint: 'Oil drain bowls installed' },
  {
    key: 'oil-drain-bowls-accumulation',
    checkpoint: 'Oil accumulation in drain bowls',
  },
  { key: 'oil-recovery-system', checkpoint: 'Oil recovery system' },
  { key: 'air-leaks', checkpoint: 'Air leaks' },
  {
    key: 'water-temp-pressure-sensors',
    checkpoint: 'Water temperature/pressure sensors and gauge condition',
  },
  {
    key: 'cabinet-cooling-units',
    checkpoint: 'Electrical cabinet cooling unit(s)',
  },
  { key: 'hmi', checkpoint: 'Human-machine-interface (HMI)' },
  { key: 'plc-battery', checkpoint: 'PLC battery or IPC battery check' },
  {
    key: 'cabinet-jumpers',
    checkpoint: 'Inspect electrical cabinet for jumpers/modifications',
  },
  { key: 'profibus-cabling', checkpoint: 'Profibus cabling and connections' },
  {
    key: 'cabinet-filter',
    checkpoint: 'Filter inspection (electrical cabinet)',
  },
  { key: 'cabinet-fan', checkpoint: 'Fan inspection (electrical cabinet)' },
  {
    key: 'rotary-manifold',
    checkpoint: 'Rotary manifold (Index machine only)',
  },
  {
    key: 'turret-locking-pin',
    checkpoint: 'Turret locking pin (Index machine only)',
  },
  {
    key: 'turret-belt-condition',
    checkpoint: 'Turret belt condition (Index machine only)',
  },
  {
    key: 'consumables-filters',
    checkpoint: 'Consumables (filters) changed / when',
  },
];

function createEmptyCheckpoints(
  definitions: ReadonlyArray<{ key: string; checkpoint: string }>,
): HuskySectionCheckpoint[] {
  return definitions.map((row) => ({
    key: row.key,
    checkpoint: row.checkpoint,
    evaluation: '',
    recommendation: '',
  }));
}

export function createEmptyHuskySafetyCheckpoints(): HuskySafetyCheckpoint[] {
  return createEmptyCheckpoints(HUSKY_SAFETY_CHECKPOINT_DEFINITIONS);
}

export function createEmptyHuskyHydraulicCheckpoints(): HuskyHydraulicCheckpoint[] {
  return createEmptyCheckpoints(HUSKY_HYDRAULIC_CHECKPOINT_DEFINITIONS);
}

export function createEmptyHuskyMechanicalCheckpoints(): HuskyMechanicalCheckpoint[] {
  return createEmptyCheckpoints(HUSKY_MECHANICAL_CHECKPOINT_DEFINITIONS);
}

export function mergeHuskyCheckpoints(
  saved: HuskySectionCheckpoint[] | undefined,
  definitions: ReadonlyArray<{ key: string; checkpoint: string }>,
): HuskySectionCheckpoint[] {
  const defaults = createEmptyCheckpoints(definitions);
  if (!saved?.length) {
    return defaults;
  }
  return defaults.map((defaultRow) => {
    const existing = saved.find((row) => row.key === defaultRow.key);
    return existing
      ? { ...defaultRow, ...existing, checkpoint: defaultRow.checkpoint }
      : defaultRow;
  });
}

export interface HuskyRequiredActualRow {
  key: string;
  label: string;
  requiredValue: string;
  actualValue: string;
}

export interface HuskyExtruderSpeedRow {
  key: string;
  item: string;
  setValue: string;
  actualValue: string;
  pressureValue: string;
}

export interface HuskyTonnageTestRow {
  key: string;
  item: string;
  t0Min: string;
  t10Min: string;
  authorizedLossTons: string;
  actualLossTons: string;
}

export interface HuskyMeasurementsData {
  accumulatorNitrogen: HuskyRequiredActualRow[];
  pumpPressure: HuskyRequiredActualRow[];
  extruderSpeedControl: HuskyExtruderSpeedRow[];
  tonnageTest: HuskyTonnageTestRow[];
}

const HUSKY_ACCUMULATOR_DEFINITIONS: ReadonlyArray<{
  key: string;
  label: string;
  requiredValue: string;
}> = [
  { key: 'system-accumulator-1', label: 'System Accumulator 1', requiredValue: '140 bars' },
  { key: 'system-accumulator-2', label: 'System Accumulator 2', requiredValue: '140 bars' },
  { key: 'system-accumulator-3', label: 'System Accumulator 3', requiredValue: '140 bars' },
  { key: 'system-accumulator-4', label: 'System Accumulator 4', requiredValue: '—' },
];

const HUSKY_PUMP_PRESSURE_DEFINITIONS: ReadonlyArray<{
  key: string;
  label: string;
  requiredValue: string;
}> = [
  { key: 'system-pump-1', label: 'System Pump 1', requiredValue: '180 bar' },
  { key: 'system-pump-2', label: 'System Pump 2', requiredValue: '—' },
  { key: 'extruder-pump-1', label: 'Extruder Pump 1', requiredValue: '120 bar' },
  { key: 'extruder-pump-2', label: 'Extruder Pump 2', requiredValue: '120 bar' },
  { key: 'extruder-pump-3', label: 'Extruder Pump 3', requiredValue: '—' },
];

const HUSKY_EXTRUDER_SPEED_DEFINITIONS: ReadonlyArray<{
  key: string;
  item: string;
  setValue: string;
}> = [{ key: 'system-pump-1', item: 'System Pump 1', setValue: '180 bar' }];

const HUSKY_TONNAGE_TEST_DEFINITIONS: ReadonlyArray<{
  key: string;
  item: string;
  t0Min: string;
  t10Min: string;
  authorizedLossTons: string;
}> = [
  {
    key: 'tonnage-test',
    item: 'Tonnage Test',
    t0Min: '190',
    t10Min: '181',
    authorizedLossTons: '19',
  },
];

function createEmptyRequiredActualRows(
  definitions: ReadonlyArray<{ key: string; label: string; requiredValue: string }>,
): HuskyRequiredActualRow[] {
  return definitions.map((row) => ({
    key: row.key,
    label: row.label,
    requiredValue: row.requiredValue,
    actualValue: '',
  }));
}

export function createEmptyHuskyMeasurements(): HuskyMeasurementsData {
  return {
    accumulatorNitrogen: createEmptyRequiredActualRows(HUSKY_ACCUMULATOR_DEFINITIONS),
    pumpPressure: createEmptyRequiredActualRows(HUSKY_PUMP_PRESSURE_DEFINITIONS),
    extruderSpeedControl: HUSKY_EXTRUDER_SPEED_DEFINITIONS.map((row) => ({
      key: row.key,
      item: row.item,
      setValue: row.setValue,
      actualValue: '',
      pressureValue: '',
    })),
    tonnageTest: HUSKY_TONNAGE_TEST_DEFINITIONS.map((row) => ({
      key: row.key,
      item: row.item,
      t0Min: row.t0Min,
      t10Min: row.t10Min,
      authorizedLossTons: row.authorizedLossTons,
      actualLossTons: '',
    })),
  };
}

export function mergeHuskyMeasurements(
  saved: HuskyMeasurementsData | undefined,
): HuskyMeasurementsData {
  const defaults = createEmptyHuskyMeasurements();
  if (!saved) {
    return defaults;
  }

  const mergeRequiredActual = (
    defaultRows: HuskyRequiredActualRow[],
    savedRows: HuskyRequiredActualRow[] | undefined,
  ): HuskyRequiredActualRow[] =>
    defaultRows.map((defaultRow) => {
      const existing = savedRows?.find((row) => row.key === defaultRow.key);
      return existing
        ? { ...defaultRow, actualValue: existing.actualValue ?? '' }
        : defaultRow;
    });

  return {
    accumulatorNitrogen: mergeRequiredActual(
      defaults.accumulatorNitrogen,
      saved.accumulatorNitrogen,
    ),
    pumpPressure: mergeRequiredActual(defaults.pumpPressure, saved.pumpPressure),
    extruderSpeedControl: defaults.extruderSpeedControl.map((defaultRow) => {
      const existing = saved.extruderSpeedControl?.find((row) => row.key === defaultRow.key);
      return existing
        ? {
            ...defaultRow,
            actualValue: existing.actualValue ?? '',
            pressureValue: existing.pressureValue ?? '',
          }
        : defaultRow;
    }),
    tonnageTest: defaults.tonnageTest.map((defaultRow) => {
      const existing = saved.tonnageTest?.find((row) => row.key === defaultRow.key);
      return existing
        ? { ...defaultRow, actualLossTons: existing.actualLossTons ?? '' }
        : defaultRow;
    }),
  };
}

export function calculateHuskyKpiPercentage(
  issuesScore: number | null,
  maxPossibleScore: number | null,
): number | null {
  if (
    issuesScore === null ||
    maxPossibleScore === null ||
    maxPossibleScore <= 0 ||
    issuesScore < 0
  ) {
    return null;
  }
  return Math.round((issuesScore / maxPossibleScore) * 10000) / 100;
}

export interface HuskyFormRecord {
  id: string;
  selected: boolean;
  machineId: string;
  machineName: string;
  maintenanceType: string;
  maintenanceFrequency: string;
  serialNo: string;
  moldNo: string;
  hotRunnerJobNo: string;
  hourMeterReading: string;
  robotSerialNo: string;
  inspector: string;
  inspectionDate: string;
  submitDate: string;
  documentNo: string;
  status: HuskyFormStatus;
  kpiRows: HuskyKpiRow[];
  safetyCheckpoints: HuskySafetyCheckpoint[];
  hydraulicCheckpoints: HuskyHydraulicCheckpoint[];
  mechanicalCheckpoints: HuskyMechanicalCheckpoint[];
  measurements: HuskyMeasurementsData;
}

export interface HuskyInspectorUser {
  userId: string;
  displayName: string;
}

/** Defined users available for inspector selection — replace with API when available. */
export const HUSKY_INSPECTOR_USERS: HuskyInspectorUser[] = [
  { userId: 'USR-001', displayName: 'Ahmed Khan' },
  { userId: 'USR-002', displayName: 'Sara Malik' },
  { userId: 'USR-003', displayName: 'Bilal Hussain' },
  { userId: 'USR-004', displayName: 'Fatima Noor' },
  { userId: 'USR-005', displayName: 'Omar Siddiqui' },
];

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable({ providedIn: 'root' })
export class HuskyFormService {
  private readonly _records = signal<HuskyFormRecord[]>([]);
  private documentSequence = 0;

  readonly records = this._records.asReadonly();

  addRecord(
    entry: Omit<HuskyFormRecord, 'id' | 'selected' | 'submitDate' | 'documentNo' | 'status'>,
  ): HuskyFormRecord {
    const now = new Date();
    const record: HuskyFormRecord = {
      ...entry,
      id: `HSK-REC-${Date.now()}`,
      selected: false,
      submitDate: formatDateValue(now),
      documentNo: this.generateDocumentNo(now),
      status: 'Submitted',
    };
    this._records.update((list) => [...list, record]);
    return record;
  }

  updateSelection(id: string, selected: boolean): void {
    this._records.update((list) =>
      list.map((r) => (r.id === id ? { ...r, selected } : r)),
    );
  }

  setAllSelected(selected: boolean, ids?: string[]): void {
    const idSet = ids ? new Set(ids) : null;
    this._records.update((list) =>
      list.map((r) => ({
        ...r,
        selected: idSet ? (idSet.has(r.id) ? selected : r.selected) : selected,
      })),
    );
  }

  getById(id: string): HuskyFormRecord | undefined {
    return this._records().find((r) => r.id === id);
  }

  updateRecord(
    id: string,
    entry: Omit<HuskyFormRecord, 'id' | 'selected' | 'submitDate' | 'documentNo' | 'status'>,
  ): boolean {
    const existing = this._records().find((r) => r.id === id);
    if (!existing) {
      return false;
    }
    this._records.update((list) =>
      list.map((r) =>
        r.id === id
          ? {
              ...r,
              ...entry,
              submitDate: r.submitDate || formatDateValue(new Date()),
              documentNo: r.documentNo || this.generateDocumentNo(new Date()),
              status: r.status === 'Draft' ? 'Submitted' : r.status,
            }
          : r,
      ),
    );
    return true;
  }

  deleteRecord(id: string): boolean {
    const before = this._records().length;
    this._records.update((list) => list.filter((r) => r.id !== id));
    return this._records().length < before;
  }

  private generateDocumentNo(date: Date): string {
    this.documentSequence += 1;
    const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const seq = String(this.documentSequence).padStart(4, '0');
    return `HSK-${ymd}-${seq}`;
  }
}
