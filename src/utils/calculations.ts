/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HourlyBlock } from "../types";

/**
 * Creates a default array of 12 hourly blocks from 08:00 to 20:00.
 */
export function createDefaultBlocks(dailyGoal: number): HourlyBlock[] {
  const startHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const count = startHours.length;
  const baseGoal = Math.round(dailyGoal / count);

  return startHours.map((hour, idx) => {
    const end = hour + 1;
    const label = `${hour.toString().padStart(2, "0")}:00 - ${end.toString().padStart(2, "0")}:00`;
    
    return {
      id: idx + 1,
      label,
      startHour: hour,
      endHour: end,
      originalGoal: baseGoal,
      adjustedGoal: baseGoal,
      actualSales: 0,
      isCompleted: false,
      note: ""
    };
  });
}

/**
 * Recalculates the hourly blocks dynamically based on completed and uncompleted hours.
 */
export function recalculateHourlyBlocks(
  dailyGoal: number,
  blocks: HourlyBlock[],
  currentHour: number,
  _currentMinute: number,
  useRealTime: boolean
): HourlyBlock[] {
  // Determine completed state for each block
  const processed = blocks.map(block => {
    const pastEnd = useRealTime && currentHour >= block.endHour;
    const isCompleted = block.isCompleted || pastEnd;
    return {
      ...block,
      isCompleted
    };
  });

  const N = processed.length;
  
  // Pass 1: Compute locking sequential adjusted targets for completed blocks
  let currentRemainingTarget = dailyGoal;
  const completedTargets: Record<number, number> = {};

  for (let i = 0; i < N; i++) {
    const block = processed[i];
    const blocksRemainingCount = N - i;
    const allocatedTarget = Math.max(0, Math.round(currentRemainingTarget / blocksRemainingCount));
    
    if (block.isCompleted) {
      completedTargets[block.id] = allocatedTarget;
      currentRemainingTarget = Math.max(0, currentRemainingTarget - block.actualSales);
    }
  }

  // Pass 2: Distribute remaining goal evenly among all currently uncompleted blocks
  const uncompletedCount = processed.filter(b => !b.isCompleted).length;
  const evenShare = uncompletedCount > 0 ? Math.max(0, Math.round(currentRemainingTarget / uncompletedCount)) : 0;

  return processed.map(block => {
    if (block.isCompleted) {
      return {
        ...block,
        adjustedGoal: completedTargets[block.id] ?? block.originalGoal
      };
    } else {
      return {
        ...block,
        adjustedGoal: evenShare
      };
    }
  });
}

/**
 * Returns the status of an hourly block
 */
export function getBlockStatus(
  block: HourlyBlock,
  currentHour: number,
  _currentMinute: number,
  useRealTime: boolean
): "completed" | "active" | "future" {
  if (block.isCompleted || (useRealTime && currentHour >= block.endHour)) {
    return "completed";
  }
  if (currentHour >= block.startHour && currentHour < block.endHour) {
    return "active";
  }
  return "future";
}

/**
 * Utility to format currencies cleanly in CZK
 */
export function formatCZK(value: number): string {
  return Math.round(value).toLocaleString("cs-CZ") + " Kč";
}
