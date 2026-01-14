import { useEffect, useState, useCallback } from "react";

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

export interface PamWeekSelectorOptions {
  useStoredWeek?: boolean;
}

const STORAGE_KEY = 'pam_selected_week';

export function usePamWeekSelector(options?: PamWeekSelectorOptions): PamWeekSelection {
  const today = new Date();
  const currentWeek = getISOWeek(today);
  const useStoredWeek = options?.useStoredWeek ?? true;
  
  // Intentar recuperar la última semana seleccionada desde localStorage
  const getInitialWeek = () => {
    if (!useStoredWeek) {
      return currentWeek;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.weekYear && parsed.weekNumber) {
          return { weekYear: parsed.weekYear, weekNumber: parsed.weekNumber };
        }
      }
    } catch (e) {
      console.warn('Error reading stored week:', e);
    }
    return currentWeek;
  };

  const [{ weekYear, weekNumber }, setWeekState] = useState(getInitialWeek);

  useEffect(() => {
    if (!useStoredWeek) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentWeek));
      } catch (e) {
        console.warn('Error saving week to localStorage:', e);
      }
    }
  }, [currentWeek, useStoredWeek]);

  const setWeek = useCallback((year: number, week: number) => {
    const newWeek = { weekYear: year, weekNumber: week };
    setWeekState(newWeek);
    // Guardar en localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWeek));
    } catch (e) {
      console.warn('Error saving week to localStorage:', e);
    }
  }, []);

  const goToCurrentWeek = useCallback(() => {
    const current = getISOWeek(new Date());
    setWeekState(current);
    // Guardar en localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Error saving week to localStorage:', e);
    }
  }, []);

  const goToPreviousWeek = useCallback(() => {
    const currentDate = new Date(Date.UTC(weekYear, 0, 1));
    currentDate.setUTCDate(currentDate.getUTCDate() + (weekNumber - 1) * 7 - 7);
    const newWeek = getISOWeek(currentDate);
    setWeekState(newWeek);
    // Guardar en localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWeek));
    } catch (e) {
      console.warn('Error saving week to localStorage:', e);
    }
  }, [weekYear, weekNumber]);

  const goToNextWeek = useCallback(() => {
    const currentDate = new Date(Date.UTC(weekYear, 0, 1));
    currentDate.setUTCDate(currentDate.getUTCDate() + (weekNumber - 1) * 7 + 7);
    const newWeek = getISOWeek(currentDate);
    setWeekState(newWeek);
    // Guardar en localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWeek));
    } catch (e) {
      console.warn('Error saving week to localStorage:', e);
    }
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
