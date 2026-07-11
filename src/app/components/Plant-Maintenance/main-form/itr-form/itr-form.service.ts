import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../../../../config/api.config';

export type ItrFormStatus = 'Draft' | 'Submitted' | 'In Review' | 'Approved' | 'Rejected';

export type ItrKpiStatus = 'Pass' | 'Warning' | 'Fail' | '';

export interface ItrKpiRow {
  key: string;
  label: string;
  formulaLabel: string;
  issuesScore: number | null;
  maxPossibleScore: number | null;
  notes: string;
}

export const ITR_KPI_ROW_DEFINITIONS: ReadonlyArray<{
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

export function createEmptyItrKpiRows(): ItrKpiRow[] {
  return ITR_KPI_ROW_DEFINITIONS.map((row) => ({
    key: row.key,
    label: row.label,
    formulaLabel: row.formulaLabel,
    issuesScore: null,
    maxPossibleScore: null,
    notes: '',
  }));
}

export function resolveItrKpiStatus(percentage: number | null): ItrKpiStatus {
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

export type ItrCheckpointEvaluation = 'Pass' | 'Fail' | 'N/A' | '';

export interface ItrSectionCheckpoint {
  key: string;
  checkpoint: string;
  evaluation: ItrCheckpointEvaluation;
  recommendation: string;
}

export type ItrSafetyCheckpoint = ItrSectionCheckpoint;
export type ItrHydraulicCheckpoint = ItrSectionCheckpoint;
export type ItrMechanicalCheckpoint = ItrSectionCheckpoint;
export type ItrRobotCheckpoint = ItrSectionCheckpoint;

export const ITR_SAFETY_CHECKPOINT_DEFINITIONS: ReadonlyArray<{
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

export const ITR_HYDRAULIC_CHECKPOINT_DEFINITIONS: ReadonlyArray<{
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

export const ITR_MECHANICAL_CHECKPOINT_DEFINITIONS: ReadonlyArray<{
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

export const ITR_ROBOT_CHECKPOINT_DEFINITIONS: ReadonlyArray<{
  key: string;
  checkpoint: string;
}> = [
  { key: 'no-unusual-movement-noises', checkpoint: 'No unusual movement or noises' },
  { key: 'general-housekeeping', checkpoint: 'General housekeeping' },
  { key: 'hose-inspection', checkpoint: 'Hose inspection' },
  { key: 'glass-broken-cracked', checkpoint: 'Glass broken / cracked' },
  {
    key: 'conveyor-belt-tracking',
    checkpoint: 'Conveyor belt damaged / tracking correctly',
  },
  {
    key: 'cam-roller-linear-bearing',
    checkpoint: 'Cam roller / linear bearing condition / lubrication',
  },
  {
    key: 'axis-belt-condition',
    checkpoint: 'Axis belt condition (Z, Y1, Y2, X)',
  },
  {
    key: 'cool-jet-belt-condition',
    checkpoint: 'Cool Jet belt condition (G Line PET only)',
  },
  { key: 'air-water-leaks', checkpoint: 'Air or water leaks' },
  { key: 'bladder-condition', checkpoint: 'Bladder condition' },
  { key: 'manual-grease-points', checkpoint: 'Manual grease points' },
  { key: 'servo-cables-condition', checkpoint: 'Servo cables condition' },
  { key: 'servo-motor-gearbox', checkpoint: 'Servo motor and gearbox' },
  { key: 'servo-encoder-batteries', checkpoint: 'Servo encoder batteries' },
  {
    key: 'robot-casting-inspection',
    checkpoint: 'Robot casting inspection for cracks / welding',
  },
];

function createEmptyCheckpoints(
  definitions: ReadonlyArray<{ key: string; checkpoint: string }>,
): ItrSectionCheckpoint[] {
  return definitions.map((row) => ({
    key: row.key,
    checkpoint: row.checkpoint,
    evaluation: '',
    recommendation: '',
  }));
}

export function createEmptyItrSafetyCheckpoints(): ItrSafetyCheckpoint[] {
  return createEmptyCheckpoints(ITR_SAFETY_CHECKPOINT_DEFINITIONS);
}

export function createEmptyItrHydraulicCheckpoints(): ItrHydraulicCheckpoint[] {
  return createEmptyCheckpoints(ITR_HYDRAULIC_CHECKPOINT_DEFINITIONS);
}

export function createEmptyItrMechanicalCheckpoints(): ItrMechanicalCheckpoint[] {
  return createEmptyCheckpoints(ITR_MECHANICAL_CHECKPOINT_DEFINITIONS);
}

export function createEmptyItrRobotCheckpoints(): ItrRobotCheckpoint[] {
  return createEmptyCheckpoints(ITR_ROBOT_CHECKPOINT_DEFINITIONS);
}

export function mergeItrCheckpoints(
  saved: ItrSectionCheckpoint[] | undefined,
  definitions: ReadonlyArray<{ key: string; checkpoint: string }>,
): ItrSectionCheckpoint[] {
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

export interface ItrRequiredActualRow {
  key: string;
  label: string;
  requiredValue: string;
  actualValue: string;
}

export interface ItrExtruderSpeedRow {
  key: string;
  item: string;
  setValue: string;
  actualValue: string;
  pressureValue: string;
}

export interface ItrTonnageTestRow {
  key: string;
  item: string;
  t0Min: string;
  t10Min: string;
  authorizedLossTons: string;
  actualLossTons: string;
}

export interface ItrMeasurementsData {
  accumulatorNitrogen: ItrRequiredActualRow[];
  pumpPressure: ItrRequiredActualRow[];
  extruderSpeedControl: ItrExtruderSpeedRow[];
  tonnageTest: ItrTonnageTestRow[];
}

const ITR_ACCUMULATOR_DEFINITIONS: ReadonlyArray<{
  key: string;
  label: string;
  requiredValue: string;
}> = [
  { key: 'system-accumulator-1', label: 'System Accumulator 1', requiredValue: '140 bars' },
  { key: 'system-accumulator-2', label: 'System Accumulator 2', requiredValue: '140 bars' },
  { key: 'system-accumulator-3', label: 'System Accumulator 3', requiredValue: '140 bars' },
  { key: 'system-accumulator-4', label: 'System Accumulator 4', requiredValue: '—' },
];

const ITR_PUMP_PRESSURE_DEFINITIONS: ReadonlyArray<{
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

const ITR_EXTRUDER_SPEED_DEFINITIONS: ReadonlyArray<{
  key: string;
  item: string;
  setValue: string;
}> = [{ key: 'system-pump-1', item: 'System Pump 1', setValue: '180 bar' }];

const ITR_TONNAGE_TEST_DEFINITIONS: ReadonlyArray<{
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
): ItrRequiredActualRow[] {
  return definitions.map((row) => ({
    key: row.key,
    label: row.label,
    requiredValue: row.requiredValue,
    actualValue: '',
  }));
}

export function createEmptyItrMeasurements(): ItrMeasurementsData {
  return {
    accumulatorNitrogen: createEmptyRequiredActualRows(ITR_ACCUMULATOR_DEFINITIONS),
    pumpPressure: createEmptyRequiredActualRows(ITR_PUMP_PRESSURE_DEFINITIONS),
    extruderSpeedControl: ITR_EXTRUDER_SPEED_DEFINITIONS.map((row) => ({
      key: row.key,
      item: row.item,
      setValue: row.setValue,
      actualValue: '',
      pressureValue: '',
    })),
    tonnageTest: ITR_TONNAGE_TEST_DEFINITIONS.map((row) => ({
      key: row.key,
      item: row.item,
      t0Min: row.t0Min,
      t10Min: row.t10Min,
      authorizedLossTons: row.authorizedLossTons,
      actualLossTons: '',
    })),
  };
}

export function mergeItrMeasurements(
  saved: ItrMeasurementsData | undefined,
): ItrMeasurementsData {
  const defaults = createEmptyItrMeasurements();
  if (!saved) {
    return defaults;
  }

  const mergeRequiredActual = (
    defaultRows: ItrRequiredActualRow[],
    savedRows: ItrRequiredActualRow[] | undefined,
  ): ItrRequiredActualRow[] =>
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

export type ItrLevelStatus = 'Pass' | 'Fail' | '';

export interface ItrLevelPointRow {
  key: string;
  levelPoint: string;
  opsValue: string;
  nopsValue: string;
}

export interface ItrRobotLevelRow {
  key: string;
  levelPoint: string;
  measuredValue: string;
  tolerance: string;
  status: ItrLevelStatus;
}

export interface ItrLevelParallelismData {
  levelPoints: ItrLevelPointRow[];
  columnGuideBushing: ItrLevelPointRow[];
  injectionLevel: ItrLevelPointRow[];
  robotLevel: ItrRobotLevelRow[];
}

const ITR_LEVEL_POINT_DEFINITIONS = ['L1', 'L2', 'L3', 'L4'] as const;
const ITR_COLUMN_GUIDE_DEFINITIONS = ['L5', 'L6', 'L7'] as const;
const ITR_INJECTION_LEVEL_DEFINITIONS = ['L8', 'L9', 'L10'] as const;

const ITR_ROBOT_LEVEL_DEFINITIONS: ReadonlyArray<{
  key: string;
  levelPoint: string;
  tolerance: string;
}> = [
  { key: 'r4-ops', levelPoint: 'R4 OPS', tolerance: '±0.15 mm/m (a)' },
  { key: 'r5-ops', levelPoint: 'R5 OPS', tolerance: '±0.30 mm/m (c)' },
];

function createEmptyLevelPointRows(levelPoints: readonly string[]): ItrLevelPointRow[] {
  return levelPoints.map((point) => ({
    key: point.toLowerCase(),
    levelPoint: point,
    opsValue: '',
    nopsValue: '',
  }));
}

export function createEmptyItrLevelParallelism(): ItrLevelParallelismData {
  return {
    levelPoints: createEmptyLevelPointRows(ITR_LEVEL_POINT_DEFINITIONS),
    columnGuideBushing: createEmptyLevelPointRows(ITR_COLUMN_GUIDE_DEFINITIONS),
    injectionLevel: createEmptyLevelPointRows(ITR_INJECTION_LEVEL_DEFINITIONS),
    robotLevel: ITR_ROBOT_LEVEL_DEFINITIONS.map((row) => ({
      key: row.key,
      levelPoint: row.levelPoint,
      measuredValue: '',
      tolerance: row.tolerance,
      status: '' as ItrLevelStatus,
    })),
  };
}

export function mergeItrLevelParallelism(
  saved: ItrLevelParallelismData | undefined,
): ItrLevelParallelismData {
  const defaults = createEmptyItrLevelParallelism();
  if (!saved) {
    return defaults;
  }

  const mergeLevelRows = (
    defaultRows: ItrLevelPointRow[],
    savedRows: ItrLevelPointRow[] | undefined,
  ): ItrLevelPointRow[] =>
    defaultRows.map((defaultRow) => {
      const existing = savedRows?.find((row) => row.key === defaultRow.key);
      return existing
        ? {
            ...defaultRow,
            opsValue: existing.opsValue ?? '',
            nopsValue: existing.nopsValue ?? '',
          }
        : defaultRow;
    });

  return {
    levelPoints: mergeLevelRows(defaults.levelPoints, saved.levelPoints),
    columnGuideBushing: mergeLevelRows(defaults.columnGuideBushing, saved.columnGuideBushing),
    injectionLevel: mergeLevelRows(defaults.injectionLevel, saved.injectionLevel),
    robotLevel: defaults.robotLevel.map((defaultRow) => {
      const existing = saved.robotLevel?.find((row) => row.key === defaultRow.key);
      return existing
        ? {
            ...defaultRow,
            measuredValue: existing.measuredValue ?? '',
            status: existing.status ?? '',
          }
        : defaultRow;
    }),
  };
}

export interface ItrCycleTimeRow {
  key: string;
  parameter: string;
  standardValue: string;
  standardSeconds: number;
  actualValue: string;
}

export interface ItrProductionDataRow {
  key: string;
  parameter: string;
  value: string;
}

export interface ItrCycleTimeComparisonData {
  nonProcessTimeDryCycle: ItrCycleTimeRow[];
  processTime: ItrCycleTimeRow[];
  productionData: ItrProductionDataRow[];
}

const ITR_DRY_CYCLE_DEFINITIONS: ReadonlyArray<{
  key: string;
  parameter: string;
  standardSeconds: number;
}> = [
  { key: 'mold-closing-time', parameter: 'Mold Closing Time', standardSeconds: 0.67 },
  {
    key: 'shutter-in-time',
    parameter: 'Shutter In Time (Clamp Lock Engaged)',
    standardSeconds: 0.23,
  },
  { key: 'clamp-up-time', parameter: 'Clamp Up Time', standardSeconds: 0.2 },
  { key: 'unclamp-time', parameter: 'Unclamp Time', standardSeconds: 0.4 },
  { key: 'shutter-out-time', parameter: 'Shutter Out Time', standardSeconds: 0.23 },
  { key: 'mold-opening-time', parameter: 'Mold Opening Time', standardSeconds: 0.67 },
  { key: 'dry-cycle-total', parameter: 'Dry Cycle Total', standardSeconds: 2.4 },
];

const ITR_PROCESS_TIME_DEFINITIONS: ReadonlyArray<{
  key: string;
  parameter: string;
  standardSeconds: number;
}> = [
  { key: 'fill-time', parameter: 'Fill Time', standardSeconds: 4.75 },
  { key: 'hold-time', parameter: 'Hold Time', standardSeconds: 5.5 },
  { key: 'cool-time', parameter: 'Cool Time', standardSeconds: 3.8 },
  { key: 'cycle-time-total', parameter: 'Cycle Time Total', standardSeconds: 17 },
  { key: 'process-totals', parameter: 'Process Totals', standardSeconds: 14.05 },
];

const ITR_PRODUCTION_DATA_DEFINITIONS: ReadonlyArray<{
  key: string;
  parameter: string;
}> = [
  { key: 'preform-weight', parameter: 'Preform Weight (g)' },
  { key: 'mold-cavities-total', parameter: 'Mold Cavities (total)' },
  { key: 'cavities-producing', parameter: 'Cavities Producing' },
  { key: 'operating-positions', parameter: 'Operating Positions (%)' },
  {
    key: 'loss-preforms-hour-cycle-time',
    parameter: 'Loss of potential preforms/hour (Cycle Time)',
  },
  {
    key: 'loss-preforms-hour-operating-positions',
    parameter: 'Loss of potential preforms/hour (Operating Positions)',
  },
];

function formatCycleTimeStandard(seconds: number): string {
  return `${seconds.toFixed(2)} sec`;
}

function createEmptyCycleTimeRows(
  definitions: ReadonlyArray<{ key: string; parameter: string; standardSeconds: number }>,
): ItrCycleTimeRow[] {
  return definitions.map((row) => ({
    key: row.key,
    parameter: row.parameter,
    standardValue: formatCycleTimeStandard(row.standardSeconds),
    standardSeconds: row.standardSeconds,
    actualValue: '',
  }));
}

export function createEmptyItrCycleTimeComparison(): ItrCycleTimeComparisonData {
  return {
    nonProcessTimeDryCycle: createEmptyCycleTimeRows(ITR_DRY_CYCLE_DEFINITIONS),
    processTime: createEmptyCycleTimeRows(ITR_PROCESS_TIME_DEFINITIONS),
    productionData: ITR_PRODUCTION_DATA_DEFINITIONS.map((row) => ({
      key: row.key,
      parameter: row.parameter,
      value: '',
    })),
  };
}

export function mergeItrCycleTimeComparison(
  saved: ItrCycleTimeComparisonData | undefined,
): ItrCycleTimeComparisonData {
  const defaults = createEmptyItrCycleTimeComparison();
  if (!saved) {
    return defaults;
  }

  const mergeCycleTimeRows = (
    defaultRows: ItrCycleTimeRow[],
    savedRows: ItrCycleTimeRow[] | undefined,
  ): ItrCycleTimeRow[] =>
    defaultRows.map((defaultRow) => {
      const existing = savedRows?.find((row) => row.key === defaultRow.key);
      return existing ? { ...defaultRow, actualValue: existing.actualValue ?? '' } : defaultRow;
    });

  return {
    nonProcessTimeDryCycle: mergeCycleTimeRows(
      defaults.nonProcessTimeDryCycle,
      saved.nonProcessTimeDryCycle,
    ),
    processTime: mergeCycleTimeRows(defaults.processTime, saved.processTime),
    productionData: defaults.productionData.map((defaultRow) => {
      const existing = saved.productionData?.find((row) => row.key === defaultRow.key);
      return existing ? { ...defaultRow, value: existing.value ?? '' } : defaultRow;
    }),
  };
}

export function calculateItrCycleTimeDeviation(
  standardSeconds: number,
  actualValue: string,
): string | null {
  const trimmed = actualValue.trim();
  if (!trimmed) {
    return null;
  }

  const numeric = Number.parseFloat(trimmed.replace(/[^\d.-]/g, ''));
  if (Number.isNaN(numeric)) {
    return null;
  }

  const diff = Math.round((numeric - standardSeconds) * 100) / 100;
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(2)} sec`;
}

export function calculateItrKpiPercentage(
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

export interface ItrReplacementItem {
  itemCode: string;
  itemName: string;
  quantity: number | null;
  fromWarehouseCode: string;
  toWarehouseCode: string;
}

export interface ItrReplacementLineGroup {
  lineKey: string;
  componentName: string;
  itemsToBeInspected: string;
  whatToCheck: string;
  items: ItrReplacementItem[];
}

export interface ItrFormRecord {
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
  inspectionDate?: string;
  postingDate: string;
  dueDate: string;
  docDate: string;
  fromWarehouseCode: string;
  toWarehouseCode: string;
  remarks: string;
  submitDate: string;
  documentNo: string;
  status: ItrFormStatus;
  kpiRows: ItrKpiRow[];
  safetyCheckpoints: ItrSafetyCheckpoint[];
  hydraulicCheckpoints: ItrHydraulicCheckpoint[];
  mechanicalCheckpoints: ItrMechanicalCheckpoint[];
  robotCheckpoints: ItrRobotCheckpoint[];
  measurements: ItrMeasurementsData;
  levelParallelism: ItrLevelParallelismData;
  cycleTimeComparison: ItrCycleTimeComparisonData;
  recommendations: string;
  performedBy: string;
  performedByEmployeeId: string;
  replacementLineGroups: ItrReplacementLineGroup[];
}

export interface ItrInspectorUser {
  userId: string;
  displayName: string;
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface ItrFormAddInput {
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
  inspectionDate?: string;
  postingDate?: string;
  dueDate?: string;
  docDate?: string;
  fromWarehouseCode?: string;
  toWarehouseCode?: string;
  remarks?: string;
  submitDate?: string;
  documentNo?: string;
  status?: string;
  kpiRows: ItrKpiRow[];
  safetyCheckpoints: ItrSectionCheckpoint[];
  hydraulicCheckpoints: ItrSectionCheckpoint[];
  mechanicalCheckpoints: ItrSectionCheckpoint[];
  robotCheckpoints: ItrSectionCheckpoint[];
  measurements: ItrMeasurementsData;
  levelParallelism: ItrLevelParallelismData;
  replacementLineGroups?: ItrReplacementLineGroup[];
}

export interface ItrSapSubmitItemPayload {
  item_code: string;
  quantity: string;
  FromWhsCod: string;
  ToWhsCode: string;
}

export interface ItrSapSubmitPayload {
  DocDate: string;
  TaxDate: string;
  from_warehouse: string;
  to_warehouse: string;
  Remarks: string;
  items: ItrSapSubmitItemPayload[];
}

export interface ItrFormSectionPayload {
  sectionName: string;
  answers: Array<Record<string, string>>;
}

export interface ItrFormAddPayload {
  machine_id: string;
  machine_name: string;
  maintenance_type: string;
  maintenance_frequency: string;
  serial_no: string;
  mold_no: string;
  hot_runner_job_no: string;
  hour_meter_reading: number;
  robot_serial_no: string;
  inspector: string;
  inspection_date: string;
  posting_date: string;
  due_date: string;
  doc_date: string;
  from_warehouse_code: string;
  to_warehouse_code: string;
  remarks: string;
  submit_date: string;
  document_no: string;
  status: string;
  sections: ItrFormSectionPayload[];
}

export interface ItrFormApiResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

const ITR_FORM_LIST_URL = apiUrl('itr-form-list');
const ITR_FORM_ADD_URL = apiUrl('itr-form-add');
const ITR_FORM_DETAIL_URL = apiUrl('itr-form-detail');
const ITR_FORM_UPDATE_URL = apiUrl('itr-form-update');
const ITR_FORM_DELETE_URL = apiUrl('itr-form-delete');
const ITR_FORM_SAP_SUBMIT_URL = apiUrl('itr_submit_in_sap');

function getKpiSectionName(row: ItrKpiRow): string {
  if (row.key === 'safety') {
    return 'Key Performance Indicators (KPI)';
  }
  return row.label;
}

function buildKpiSection(row: ItrKpiRow): ItrFormSectionPayload | null {
  const answers: Array<Record<string, string>> = [];

  if (row.issuesScore !== null) {
    answers.push({ question: 'Issues Score', value: String(row.issuesScore) });
  }
  if (row.maxPossibleScore !== null) {
    answers.push({ question: 'Max Possible Score', value: String(row.maxPossibleScore) });
  }
  if (row.notes.trim()) {
    answers.push({ question: 'Notes', value: row.notes.trim() });
  }

  if (answers.length === 0) {
    return null;
  }

  return {
    sectionName: getKpiSectionName(row),
    answers,
  };
}

function buildCheckpointSection(
  sectionName: string,
  checkpoints: ItrSectionCheckpoint[],
): ItrFormSectionPayload | null {
  const answers = checkpoints
    .filter((row) => row.evaluation.trim() || row.recommendation.trim())
    .map((row) => ({
      question: row.checkpoint,
      Evaluation: row.evaluation.trim(),
      Recommendation: row.recommendation.trim(),
    }));

  if (answers.length === 0) {
    return null;
  }

  return { sectionName, answers };
}

function buildLevelParallelismSection(rows: ItrLevelPointRow[]): ItrFormSectionPayload | null {
  const answers = rows
    .filter((row) => row.opsValue.trim() || row.nopsValue.trim())
    .map((row) => ({
      level: row.levelPoint,
      ops: row.opsValue.trim(),
      nops: row.nopsValue.trim(),
    }));

  if (answers.length === 0) {
    return null;
  }

  return {
    sectionName: 'Level / Parallelism',
    answers,
  };
}

export function buildItrFormAddPayload(entry: ItrFormAddInput): ItrFormAddPayload {
  const hourMeter = Number.parseFloat(entry.hourMeterReading.trim().replace(/[^\d.-]/g, ''));
  const sections: ItrFormSectionPayload[] = [];

  for (const row of entry.kpiRows) {
    const section = buildKpiSection(row);
    if (section) {
      sections.push(section);
    }
  }

  const checkpointSections: Array<[string, ItrSectionCheckpoint[]]> = [
    ['Safety', entry.safetyCheckpoints],
    ['Hydraulic and Hydraulic Manifolds', entry.hydraulicCheckpoints],
    ['Mechanical / Pneumatic / Water / Electrical / Software', entry.mechanicalCheckpoints],
    ['Robot and Conveyor Checkpoints', entry.robotCheckpoints],
  ];

  for (const [sectionName, checkpoints] of checkpointSections) {
    const section = buildCheckpointSection(sectionName, checkpoints);
    if (section) {
      sections.push(section);
    }
  }

  const accumulatorAnswers = entry.measurements.accumulatorNitrogen
    .filter((row) => row.actualValue.trim())
    .map((row) => ({
      Accumulator: row.label,
      required_value: row.requiredValue,
      actual_value: row.actualValue.trim(),
    }));
  if (accumulatorAnswers.length > 0) {
    sections.push({
      sectionName: 'Accumulator Nitrogen Pressure',
      answers: accumulatorAnswers,
    });
  }

  const pumpAnswers = entry.measurements.pumpPressure
    .filter((row) => row.actualValue.trim())
    .map((row) => ({
      Pump: row.label,
      required_value: row.requiredValue,
      actual_value: row.actualValue.trim(),
    }));
  if (pumpAnswers.length > 0) {
    sections.push({
      sectionName: 'Pump Pressure Measurement / Calibration',
      answers: pumpAnswers,
    });
  }

  const extruderAnswers = entry.measurements.extruderSpeedControl
    .filter((row) => row.actualValue.trim() || row.pressureValue.trim())
    .map((row) => ({
      item: row.item,
      required_value: row.setValue,
      actual_value: row.actualValue.trim(),
      pressure_value: row.pressureValue.trim(),
    }));
  if (extruderAnswers.length > 0) {
    sections.push({
      sectionName: 'Extruder Speed Control A',
      answers: extruderAnswers,
    });
  }

  const tonnageAnswers = entry.measurements.tonnageTest
    .filter((row) => row.actualLossTons.trim())
    .map((row) => ({
      item: row.item,
      t0: row.t0Min,
      t10: row.t10Min,
      authrized_loss: row.authorizedLossTons,
      actual_loss: row.actualLossTons.trim(),
    }));
  if (tonnageAnswers.length > 0) {
    sections.push({
      sectionName: 'Tonnage Test',
      answers: tonnageAnswers,
    });
  }

  for (const levelRows of [
    entry.levelParallelism.levelPoints,
    entry.levelParallelism.columnGuideBushing,
    entry.levelParallelism.injectionLevel,
  ]) {
    const section = buildLevelParallelismSection(levelRows);
    if (section) {
      sections.push(section);
    }
  }

  const replacementAnswers = (entry.replacementLineGroups ?? [])
    .flatMap((group) =>
      group.items.map((item) => ({
        line_key: group.lineKey,
        component_name: group.componentName,
        items_to_be_inspected: group.itemsToBeInspected,
        what_to_check: group.whatToCheck,
        item_code: item.itemCode.trim(),
        item_name: item.itemName.trim(),
        quantity:
          item.quantity === null || item.quantity === undefined
            ? ''
            : String(item.quantity),
        from_warehouse_code: item.fromWarehouseCode.trim(),
        to_warehouse_code: item.toWarehouseCode.trim(),
      })),
    )
    .filter(
      (answer) =>
        answer.item_code ||
        answer.item_name ||
        answer.quantity ||
        answer.from_warehouse_code ||
        answer.to_warehouse_code ||
        answer.items_to_be_inspected ||
        answer.what_to_check,
    );
  if (replacementAnswers.length > 0) {
    sections.push({
      sectionName: 'Replacement Items',
      answers: replacementAnswers,
    });
  }

  return {
    machine_id: entry.machineId.trim(),
    machine_name: entry.machineName.trim(),
    maintenance_type: entry.maintenanceType.trim(),
    maintenance_frequency: entry.maintenanceFrequency.trim(),
    serial_no: entry.serialNo.trim(),
    mold_no: entry.moldNo.trim(),
    hot_runner_job_no: entry.hotRunnerJobNo.trim(),
    hour_meter_reading: Number.isFinite(hourMeter) ? hourMeter : 0,
    robot_serial_no: entry.robotSerialNo.trim(),
    inspector: entry.inspector.trim(),
    inspection_date: entry.inspectionDate?.trim() || '',
    posting_date: entry.postingDate?.trim() || '',
    due_date: entry.dueDate?.trim() || '',
    doc_date: entry.docDate?.trim() || '',
    from_warehouse_code: entry.fromWarehouseCode?.trim() || '',
    to_warehouse_code: entry.toWarehouseCode?.trim() || '',
    remarks: entry.remarks?.trim() || '',
    submit_date: entry.submitDate?.trim() || formatDateValue(new Date()),
    document_no: entry.documentNo?.trim() || '',
    status: entry.status?.trim() || 'Draft',
    sections,
  };
}

export const buildItrFormPayload = buildItrFormAddPayload;

export function buildItrSapSubmitPayload(entry: ItrFormAddInput): ItrSapSubmitPayload {
  const items = (entry.replacementLineGroups ?? [])
    .flatMap((group) =>
      group.items.map((item) => ({
        item_code: item.itemCode.trim(),
        quantity:
          item.quantity === null || item.quantity === undefined
            ? ''
            : String(item.quantity),
        FromWhsCod: item.fromWarehouseCode.trim(),
        ToWhsCode: item.toWarehouseCode.trim(),
      })),
    )
    .filter(
      (item) =>
        item.item_code &&
        item.quantity &&
        item.FromWhsCod &&
        item.ToWhsCode,
    );

  return {
    DocDate: entry.postingDate?.trim() || '',
    TaxDate: entry.docDate?.trim() || '',
    from_warehouse: entry.fromWarehouseCode?.trim() || '',
    to_warehouse: entry.toWarehouseCode?.trim() || '',
    Remarks: entry.remarks?.trim() || '',
    items,
  };
}

function pickStringValue(sources: Array<Record<string, unknown>>, keys: string[]): string {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
  }
  return '';
}

function parseNumberOrNull(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAnswer(answer: unknown): Record<string, string> {
  if (!answer || typeof answer !== 'object') {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(answer as Record<string, unknown>)) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  return result;
}

function extractSections(item: Record<string, unknown>): ItrFormSectionPayload[] {
  const raw = item['sections'] ?? item['Sections'];
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((section): section is Record<string, unknown> => !!section && typeof section === 'object')
    .map((section) => ({
      sectionName: pickStringValue([section], ['sectionName', 'section_name', 'SectionName']),
      answers: (() => {
        const rawAnswers = section['answers'] ?? section['Answers'];
        if (!Array.isArray(rawAnswers)) {
          return [];
        }
        return rawAnswers
          .filter((answer): answer is Record<string, unknown> => !!answer && typeof answer === 'object')
          .map((answer) => normalizeAnswer(answer));
      })(),
    }))
    .filter((section) => section.sectionName);
}

function findSection(
  sections: ItrFormSectionPayload[],
  sectionName: string,
): ItrFormSectionPayload | undefined {
  return sections.find((section) => section.sectionName === sectionName);
}

function findSections(
  sections: ItrFormSectionPayload[],
  sectionName: string,
): ItrFormSectionPayload[] {
  return sections.filter((section) => section.sectionName === sectionName);
}

function applyKpiSection(row: ItrKpiRow, answers: Array<Record<string, string>>): ItrKpiRow {
  let issuesScore = row.issuesScore;
  let maxPossibleScore = row.maxPossibleScore;
  let notes = row.notes;

  for (const answer of answers) {
    const question = pickStringValue([answer], ['question', 'Question']);
    const value = pickStringValue([answer], ['value', 'Value']);
    if (question === 'Issues Score') {
      issuesScore = parseNumberOrNull(value);
    } else if (question === 'Max Possible Score') {
      maxPossibleScore = parseNumberOrNull(value);
    } else if (question === 'Notes') {
      notes = value;
    }
  }

  return { ...row, issuesScore, maxPossibleScore, notes };
}

function applyCheckpointSection(
  checkpoints: ItrSectionCheckpoint[],
  answers: Array<Record<string, string>>,
): ItrSectionCheckpoint[] {
  return checkpoints.map((checkpoint) => {
    const match = answers.find(
      (answer) => pickStringValue([answer], ['question', 'Question']) === checkpoint.checkpoint,
    );
    if (!match) {
      return checkpoint;
    }

    return {
      ...checkpoint,
      evaluation: pickStringValue([match], ['Evaluation', 'evaluation']) as ItrCheckpointEvaluation,
      recommendation: pickStringValue([match], ['Recommendation', 'recommendation']),
    };
  });
}

function applyRequiredActualRows(
  rows: ItrRequiredActualRow[],
  answers: Array<Record<string, string>>,
  labelKeys: string[],
): ItrRequiredActualRow[] {
  return rows.map((row) => {
    const match = answers.find((answer) => {
      const label = labelKeys.map((key) => answer[key]).find(Boolean);
      return label === row.label;
    });
    if (!match) {
      return row;
    }

    return {
      ...row,
      requiredValue:
        pickStringValue([match], ['required_value', 'requiredValue']) || row.requiredValue,
      actualValue: pickStringValue([match], ['actual_value', 'actualValue']),
    };
  });
}

function applyExtruderRows(
  rows: ItrExtruderSpeedRow[],
  answers: Array<Record<string, string>>,
): ItrExtruderSpeedRow[] {
  return rows.map((row) => {
    const match = answers.find(
      (answer) => pickStringValue([answer], ['item', 'Item']) === row.item,
    );
    if (!match) {
      return row;
    }

    return {
      ...row,
      setValue: pickStringValue([match], ['required_value', 'requiredValue']) || row.setValue,
      actualValue: pickStringValue([match], ['actual_value', 'actualValue']),
      pressureValue: pickStringValue([match], ['pressure_value', 'pressureValue']),
    };
  });
}

function applyTonnageRows(
  rows: ItrTonnageTestRow[],
  answers: Array<Record<string, string>>,
): ItrTonnageTestRow[] {
  return rows.map((row) => {
    const match = answers.find(
      (answer) => pickStringValue([answer], ['item', 'Item']) === row.item,
    );
    if (!match) {
      return row;
    }

    return {
      ...row,
      t0Min: pickStringValue([match], ['t0', 't0Min']) || row.t0Min,
      t10Min: pickStringValue([match], ['t10', 't10Min']) || row.t10Min,
      authorizedLossTons:
        pickStringValue([match], ['authrized_loss', 'authorized_loss', 'authorizedLossTons']) ||
        row.authorizedLossTons,
      actualLossTons: pickStringValue([match], ['actual_loss', 'actualLossTons']),
    };
  });
}

function applyLevelRows(
  rows: ItrLevelPointRow[],
  answers: Array<Record<string, string>>,
): ItrLevelPointRow[] {
  return rows.map((row) => {
    const match = answers.find(
      (answer) => pickStringValue([answer], ['level', 'Level']) === row.levelPoint,
    );
    if (!match) {
      return row;
    }

    return {
      ...row,
      opsValue: pickStringValue([match], ['ops', 'Ops']),
      nopsValue: pickStringValue([match], ['nops', 'Nops']),
    };
  });
}

function mapReplacementLineGroups(
  sections: ItrFormSectionPayload[],
): ItrReplacementLineGroup[] {
  const replacementSection = findSection(sections, 'Replacement Items');
  if (!replacementSection) {
    return [];
  }

  const groupMap = new Map<string, ItrReplacementLineGroup>();

  for (const answer of replacementSection.answers) {
    const lineKey =
      pickStringValue([answer], ['line_key', 'lineKey']) ||
      `${pickStringValue([answer], ['component_name', 'componentName'])}-${groupMap.size}`;
    const componentName = pickStringValue([answer], ['component_name', 'componentName']);
    const itemsToBeInspected = pickStringValue([answer], [
      'items_to_be_inspected',
      'itemsToBeInspected',
    ]);
    const whatToCheck = pickStringValue([answer], ['what_to_check', 'whatToCheck']);
    const itemCode = pickStringValue([answer], ['item_code', 'itemCode']);
    const itemName = pickStringValue([answer], ['item_name', 'itemName']);
    const quantity = parseNumberOrNull(pickStringValue([answer], ['quantity', 'Quantity']));
    const fromWarehouseCode = pickStringValue([answer], [
      'from_warehouse_code',
      'fromWarehouseCode',
      'from_warehouse',
      'fromWarehouse',
    ]);
    const toWarehouseCode = pickStringValue([answer], [
      'to_warehouse_code',
      'toWarehouseCode',
      'to_warehouse',
      'toWarehouse',
    ]);

    const existing = groupMap.get(lineKey);
    const item = { itemCode, itemName, quantity, fromWarehouseCode, toWarehouseCode };
    if (existing) {
      existing.items.push(item);
      continue;
    }

    groupMap.set(lineKey, {
      lineKey,
      componentName,
      itemsToBeInspected,
      whatToCheck,
      items: [item],
    });
  }

  return Array.from(groupMap.values());
}

function mapSectionsToFormParts(sections: ItrFormSectionPayload[]): {
  kpiRows: ItrKpiRow[];
  safetyCheckpoints: ItrSectionCheckpoint[];
  hydraulicCheckpoints: ItrSectionCheckpoint[];
  mechanicalCheckpoints: ItrSectionCheckpoint[];
  robotCheckpoints: ItrSectionCheckpoint[];
  measurements: ItrMeasurementsData;
  levelParallelism: ItrLevelParallelismData;
  replacementLineGroups: ItrReplacementLineGroup[];
} {
  let kpiRows = createEmptyItrKpiRows().map((row) => {
    const section = findSection(sections, getKpiSectionName(row));
    return section ? applyKpiSection(row, section.answers) : row;
  });

  let safetyCheckpoints = applyCheckpointSection(
    createEmptyItrSafetyCheckpoints(),
    findSection(sections, 'Safety')?.answers ?? [],
  );
  let hydraulicCheckpoints = applyCheckpointSection(
    createEmptyItrHydraulicCheckpoints(),
    findSection(sections, 'Hydraulic and Hydraulic Manifolds')?.answers ?? [],
  );
  let mechanicalCheckpoints = applyCheckpointSection(
    createEmptyItrMechanicalCheckpoints(),
    findSection(sections, 'Mechanical / Pneumatic / Water / Electrical / Software')?.answers ?? [],
  );
  let robotCheckpoints = applyCheckpointSection(
    createEmptyItrRobotCheckpoints(),
    findSection(sections, 'Robot and Conveyor Checkpoints')?.answers ?? [],
  );

  let measurements = createEmptyItrMeasurements();
  const accumulatorSection = findSection(sections, 'Accumulator Nitrogen Pressure');
  if (accumulatorSection) {
    measurements = {
      ...measurements,
      accumulatorNitrogen: applyRequiredActualRows(
        measurements.accumulatorNitrogen,
        accumulatorSection.answers,
        ['Accumulator'],
      ),
    };
  }

  const pumpSection = findSection(sections, 'Pump Pressure Measurement / Calibration');
  if (pumpSection) {
    measurements = {
      ...measurements,
      pumpPressure: applyRequiredActualRows(
        measurements.pumpPressure,
        pumpSection.answers,
        ['Pump'],
      ),
    };
  }

  const extruderSection = findSection(sections, 'Extruder Speed Control A');
  if (extruderSection) {
    measurements = {
      ...measurements,
      extruderSpeedControl: applyExtruderRows(
        measurements.extruderSpeedControl,
        extruderSection.answers,
      ),
    };
  }

  const tonnageSection = findSection(sections, 'Tonnage Test');
  if (tonnageSection) {
    measurements = {
      ...measurements,
      tonnageTest: applyTonnageRows(measurements.tonnageTest, tonnageSection.answers),
    };
  }

  const levelSections = findSections(sections, 'Level / Parallelism');
  let levelParallelism = createEmptyItrLevelParallelism();
  if (levelSections[0]) {
    levelParallelism = {
      ...levelParallelism,
      levelPoints: applyLevelRows(levelParallelism.levelPoints, levelSections[0].answers),
    };
  }
  if (levelSections[1]) {
    levelParallelism = {
      ...levelParallelism,
      columnGuideBushing: applyLevelRows(
        levelParallelism.columnGuideBushing,
        levelSections[1].answers,
      ),
    };
  }
  if (levelSections[2]) {
    levelParallelism = {
      ...levelParallelism,
      injectionLevel: applyLevelRows(levelParallelism.injectionLevel, levelSections[2].answers),
    };
  }

  return {
    kpiRows,
    safetyCheckpoints,
    hydraulicCheckpoints,
    mechanicalCheckpoints,
    robotCheckpoints,
    measurements,
    levelParallelism,
    replacementLineGroups: mapReplacementLineGroups(sections),
  };
}

function mapApiItemToRecord(item: Record<string, unknown>): ItrFormRecord {
  const sources = [item];
  const sections = extractSections(item);
  const sectionParts = mapSectionsToFormParts(sections);
  const status = pickStringValue(sources, ['status', 'Status']) as ItrFormStatus;

  return {
    id: pickStringValue(sources, ['id', 'Id', 'itr_form_id', 'itrFormId']),
    selected: false,
    machineId: pickStringValue(sources, ['machine_id', 'machineId', 'MachineId']),
    machineName: pickStringValue(sources, ['machine_name', 'machineName', 'MachineName']),
    maintenanceType: pickStringValue(sources, ['maintenance_type', 'maintenanceType', 'MaintenanceType']),
    maintenanceFrequency: pickStringValue(sources, [
      'maintenance_frequency',
      'maintenanceFrequency',
      'MaintenanceFrequency',
    ]),
    serialNo: pickStringValue(sources, ['serial_no', 'serialNo', 'SerialNo']),
    moldNo: pickStringValue(sources, ['mold_no', 'moldNo', 'MoldNo']),
    hotRunnerJobNo: pickStringValue(sources, [
      'hot_runner_job_no',
      'hotRunnerJobNo',
      'HotRunnerJobNo',
    ]),
    hourMeterReading: pickStringValue(sources, [
      'hour_meter_reading',
      'hourMeterReading',
      'HourMeterReading',
    ]),
    robotSerialNo: pickStringValue(sources, ['robot_serial_no', 'robotSerialNo', 'RobotSerialNo']),
    inspector: pickStringValue(sources, ['inspector', 'Inspector']),
    inspectionDate: pickStringValue(sources, ['inspection_date', 'inspectionDate', 'InspectionDate']),
    postingDate: pickStringValue(sources, ['posting_date', 'postingDate', 'PostingDate']),
    dueDate: pickStringValue(sources, ['due_date', 'dueDate', 'DueDate']),
    docDate: pickStringValue(sources, ['doc_date', 'docDate', 'DocDate']),
    fromWarehouseCode: pickStringValue(sources, [
      'from_warehouse_code',
      'fromWarehouseCode',
      'from_warehouse',
      'fromWarehouse',
    ]),
    toWarehouseCode: pickStringValue(sources, [
      'to_warehouse_code',
      'toWarehouseCode',
      'to_warehouse',
      'toWarehouse',
    ]),
    remarks: pickStringValue(sources, ['remarks', 'Remarks']),
    submitDate: pickStringValue(sources, ['submit_date', 'submitDate', 'SubmitDate']),
    documentNo: pickStringValue(sources, ['document_no', 'documentNo', 'DocumentNo']),
    status: (status || 'Draft') as ItrFormStatus,
    kpiRows: sectionParts.kpiRows,
    safetyCheckpoints: sectionParts.safetyCheckpoints,
    hydraulicCheckpoints: sectionParts.hydraulicCheckpoints,
    mechanicalCheckpoints: sectionParts.mechanicalCheckpoints,
    robotCheckpoints: sectionParts.robotCheckpoints,
    measurements: sectionParts.measurements,
    levelParallelism: sectionParts.levelParallelism,
    cycleTimeComparison: createEmptyItrCycleTimeComparison(),
    recommendations: pickStringValue(sources, ['recommendations', 'Recommendations']),
    performedBy: pickStringValue(sources, ['performed_by', 'performedBy', 'PerformedBy']),
    performedByEmployeeId: pickStringValue(sources, [
      'performed_by_employee_id',
      'performedByEmployeeId',
      'PerformedByEmployeeId',
    ]),
    replacementLineGroups: sectionParts.replacementLineGroups,
  };
}

@Injectable({ providedIn: 'root' })
export class ItrFormService {
  private readonly http = inject(HttpClient);
  private readonly _records = signal<ItrFormRecord[]>([]);
  private documentSequence = 0;

  readonly records = this._records.asReadonly();

  fetchItrForms(): Observable<ItrFormRecord[]> {
    return this.http.get<unknown>(ITR_FORM_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => mapApiItemToRecord(item))),
      tap((records) => this._records.set(records)),
    );
  }

  fetchItrFormDetail(id: string | number): Observable<ItrFormRecord> {
    const identifier = encodeURIComponent(String(id));
    return this.http
      .get<unknown>(`${ITR_FORM_DETAIL_URL}/${identifier}`)
      .pipe(map((response) => this.mapDetailResponse(response, id)));
  }

  addItrForm(entry: ItrFormAddInput): Observable<ItrFormApiResponse> {
    return this.http.post<ItrFormApiResponse>(
      ITR_FORM_SAP_SUBMIT_URL,
      buildItrSapSubmitPayload(entry),
    );
  }

  updateItrForm(id: string | number, entry: ItrFormAddInput): Observable<ItrFormApiResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post<ItrFormApiResponse>(
      `${ITR_FORM_UPDATE_URL}/${identifier}`,
      buildItrFormAddPayload(entry),
    );
  }

  deleteItrForm(id: string | number): Observable<ItrFormApiResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete<ItrFormApiResponse>(`${ITR_FORM_DELETE_URL}/${identifier}`);
  }

  removeItrFormRecord(record: ItrFormRecord): void {
    this._records.update((list) => list.filter((item) => item.id !== record.id));
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

  getById(id: string): ItrFormRecord | undefined {
    return this._records().find((r) => r.id === id);
  }

  private mapDetailResponse(response: unknown, id: string | number): ItrFormRecord {
    const items = this.extractApiItems(response);
    if (items.length > 0) {
      return mapApiItemToRecord(items[0]);
    }

    if (response && typeof response === 'object') {
      const record = mapApiItemToRecord(response as Record<string, unknown>);
      if (!record.id) {
        return { ...record, id: String(id) };
      }
      return record;
    }

    throw new Error('ITR Form record not found');
  }

  private extractApiItems(response: unknown): Array<Record<string, unknown>> {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }

    if (typeof response !== 'object') {
      return [];
    }

    const obj = response as Record<string, unknown>;
    const arrayKeys = [
      'data',
      'items',
      'results',
      'records',
      'list',
      'itr_forms',
      'itrForms',
      'itrFormList',
      'itr_form_list',
    ];

    for (const key of arrayKeys) {
      const value = obj[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      }
    }

    const nestedData = obj['data'];
    if (nestedData && typeof nestedData === 'object') {
      const nestedItems = this.extractApiItems(nestedData);
      if (nestedItems.length > 0) {
        return nestedItems;
      }
    }

    if (
      obj['machine_id'] ||
      obj['machineId'] ||
      obj['machine_name'] ||
      obj['machineName'] ||
      obj['document_no'] ||
      obj['documentNo']
    ) {
      return [obj];
    }

    return [];
  }

  private generateDocumentNo(date: Date): string {
    this.documentSequence += 1;
    const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const seq = String(this.documentSequence).padStart(4, '0');
    return `ITR-${ymd}-${seq}`;
  }
}
