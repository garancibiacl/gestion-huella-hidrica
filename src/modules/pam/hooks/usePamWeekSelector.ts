import { useState, useCallback } from "react";

function getISOWeek(date: Date): { weekYear: number; weekNumber: number } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const weekNumber =
    1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
  const weekYear = target.getUTCFullYear();
  return { weekYear, weekNumber };
}

export interface PamWeekSelection {
  weekYear: number;
  weekNumber: number;
  label: string;
  setWeek: (year: number, week: number) => void;
  goToCurrentWeek: () => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
}

export function usePamWeekSelector(): PamWeekSelection {
  const today = new Date();
  const initial = getISOWeek(today);
  const [{ weekYear, weekNumber }, setWeekState] = useState(initial);

  const setWeek = useCallback((year: number, week: number) => {
    setWeekState({ weekYear: year, weekNumber: week });
  }, []);

  const goToCurrentWeek = useCallback(() => {
    const current = getISOWeek(new Date());
    setWeekState(current);
  }, []);

  const goToPreviousWeek = useCallback(() => {
    const currentDate = new Date(Date.UTC(weekYear, 0, 1));
    currentDate.setUTCDate(currentDate.getUTCDate() + (weekNumber - 1) * 7 - 7);
    setWeekState(getISOWeek(currentDate));
  }, [weekYear, weekNumber]);

  const goToNextWeek = useCallback(() => {
    const currentDate = new Date(Date.UTC(weekYear, 0, 1));
    currentDate.setUTCDate(currentDate.getUTCDate() + (weekNumber - 1) * 7 + 7);
    setWeekState(getISOWeek(currentDate));
  }, [weekYear, weekNumber]);

  const label = `Semana W${String(weekNumber).padStart(2, "0")} · ${weekYear}`;

  return {
    weekYear,
    weekNumber,
    label,
    setWeek,
    goToCurrentWeek,
    goToPreviousWeek,
    goToNextWeek,
  };
}
