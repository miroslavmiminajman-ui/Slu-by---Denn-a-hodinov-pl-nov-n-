/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CalculationResult {
  branchName: string;
  revenueRR: number;
  planAsrServicesRevenue: number;
  serviceAsistRevenue: number;
  daysRemaining: number;
  weekdaysRemaining: number;
  weekendsRemaining: number;
  isTodayWeekend: boolean;
  finalValue: number;
  rawRow?: any[];
}

export interface HourlyBlock {
  id: number;
  label: string;
  startHour: number;
  endHour: number;
  originalGoal: number;
  adjustedGoal: number;
  actualSales: number;
  isCompleted: boolean;
  note?: string;
}

export interface AppSettings {
  useRealTime: boolean;
  simulatedHour: number;
  simulatedMinute: number;
  defaultDailyGoal: number;
}

export interface DayProgress {
  id: string;
  date: string;
  selectedBranch?: string;
  dailyGoal: number;
  totalSales: number;
  hourlyBlocks: HourlyBlock[];
  notes?: string;
}
