import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(month: number | null | undefined, year: number | null | undefined): string {
  if (!year && !month) return "";
  if (month && year) return `${MONTH_ABBR[month - 1]} ${year}`;
  if (year) return `${year}`;
  return "";
}

export function formatDateRange(
  monthFrom: number | null | undefined,
  yearFrom: number | null | undefined,
  monthTo: number | null | undefined,
  yearTo: number | null | undefined,
  isCurrent?: boolean
): string {
  const start = formatDate(monthFrom, yearFrom);
  const end = isCurrent ? "Present" : formatDate(monthTo, yearTo);
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return "";
}
