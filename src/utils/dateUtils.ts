/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RemainingDaysInfo {
  total: number;
  weekdays: number;
  weekends: number;
  isTodayWeekend: boolean;
}

/**
 * Calculates the number of days, weekdays, and weekends remaining in the current month,
 * starting from today (inclusive).
 */
export function getRemainingDaysInfo(): RemainingDaysInfo {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  const currentDate = today.getDate();

  const lastDay = new Date(year, month + 1, 0).getDate();

  let weekdays = 0;
  let weekends = 0;

  for (let d = currentDate; d <= lastDay; d++) {
    const dateToCheck = new Date(year, month, d);
    const dayOfWeek = dateToCheck.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekends++;
    } else {
      weekdays++;
    }
  }

  const todayDayOfWeek = today.getDay();
  const isTodayWeekend = todayDayOfWeek === 0 || todayDayOfWeek === 6;

  return {
    total: lastDay - currentDate + 1,
    weekdays,
    weekends,
    isTodayWeekend
  };
}
